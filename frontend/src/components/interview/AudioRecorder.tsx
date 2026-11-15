import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, RotateCcw, AlertTriangle, CheckCircle2, Loader2, Volume2 } from 'lucide-react';
import { attemptApi } from '../../api/client';
import { SpeechMetrics } from '../../types';

interface AudioRecorderProps {
  onTranscriptionComplete: (transcript: string, audioDurationSec: number, metrics: SpeechMetrics) => void;
  disabled?: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onTranscriptionComplete,
  disabled = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      stopAllStreams();
    };
  }, []);

  const stopAllStreams = () => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        // Gradient color for audio visualizer
        canvasCtx.fillStyle = `rgb(99, 102, 241)`;
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 2;
        if (x > canvas.width) break;
      }
    };

    render();
  };

  const startRecording = async () => {
    setErrorMessage(null);
    audioChunksRef.current = [];
    setRecordedBlob(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support audio recording.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Audio analysis for visualizer
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      drawWaveform();

      // Check supported mime types
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        await handleTranscribe(blob, recordingSeconds);
      };

      mediaRecorder.start(250); // Slice every 250ms
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser.');
      } else {
        setErrorMessage(err.message || 'Failed to start microphone recording.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  };

  const handleTranscribe = async (blob: Blob, durationSec: number) => {
    setIsTranscribing(true);
    setErrorMessage(null);
    try {
      const response = await attemptApi.transcribe(blob);
      onTranscriptionComplete(
        response.transcript,
        response.audio_duration_sec || durationSec,
        response.speech_metrics
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to transcribe audio. You may type your answer directly.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleReset = () => {
    stopAllStreams();
    setIsRecording(false);
    setRecordingSeconds(0);
    setRecordedBlob(null);
    setErrorMessage(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-5">
      {/* Waveform / Visualizer display */}
      <div className="w-full flex flex-col items-center justify-center h-28 bg-slate-950/60 rounded-xl border border-slate-800/80 px-4 relative overflow-hidden">
        {isRecording ? (
          <canvas ref={canvasRef} className="w-full h-20" width={320} height={80} />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-500 space-y-1">
            <Volume2 className="w-6 h-6 text-slate-600 animate-pulse" />
            <span className="text-xs">Live audio waveform will visualize when speaking</span>
          </div>
        )}

        {/* Live Timer Tag */}
        {isRecording && (
          <div className="absolute top-2 right-3 flex items-center space-x-1.5 bg-red-500/20 border border-red-500/40 text-red-400 text-xs px-2.5 py-0.5 rounded-full font-mono">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>REC {formatTime(recordingSeconds)}</span>
          </div>
        )}
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="w-full flex items-center space-x-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center space-x-4">
        {!isRecording && !isTranscribing && (
          <button
            type="button"
            onClick={startRecording}
            disabled={disabled}
            className="flex items-center space-x-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors shadow-lg shadow-rose-600/20"
          >
            <Mic className="w-4 h-4" />
            <span>{recordedBlob ? 'Record Again' : 'Start Speaking'}</span>
          </button>
        )}

        {isRecording && (
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center space-x-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/30 rounded-lg font-medium text-sm transition-colors"
          >
            <Square className="w-4 h-4 fill-rose-500 text-rose-500" />
            <span>Finish Speaking ({formatTime(recordingSeconds)})</span>
          </button>
        )}

        {isTranscribing && (
          <div className="flex items-center space-x-2.5 px-5 py-2.5 bg-slate-800 text-indigo-400 rounded-lg text-sm border border-indigo-500/30">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Transcribing with Whisper & extracting speech metrics...</span>
          </div>
        )}

        {recordedBlob && !isRecording && !isTranscribing && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center space-x-1.5 px-3 py-2 text-slate-400 hover:text-slate-200 text-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Audio</span>
          </button>
        )}
      </div>

      <div className="text-xs text-slate-500 text-center max-w-sm">
        Speak naturally. Voice answers are evaluated on communication pace (WPM), filler-word frequency, clarity, and technical completeness.
      </div>
    </div>
  );
};
