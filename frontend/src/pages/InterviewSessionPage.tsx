import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionApi, questionApi, attemptApi } from '../api/client';
import { Session, Question, SpeechMetrics, Attempt } from '../types';
import { TextEditor } from '../components/interview/TextEditor';
import { AudioRecorder } from '../components/interview/AudioRecorder';
import { 
  Clock, 
  Send, 
  Sparkles, 
  Volume2, 
  Type, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Brain,
  HelpCircle
} from 'lucide-react';

export const InterviewSessionPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<Session | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Answering state
  const [answerMode, setAnswerMode] = useState<'text' | 'voice'>('text');
  const [answerText, setAnswerText] = useState('');
  const [audioDurationSec, setAudioDurationSec] = useState<number | null>(null);
  const [speechMetrics, setSpeechMetrics] = useState<SpeechMetrics | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evalProgressStep, setEvalProgressStep] = useState(0);

  // Question Timer
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (sessionId) {
      loadSession();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionId]);

  const loadSession = async () => {
    try {
      setLoading(true);
      setError(null);
      const sessionData = await sessionApi.getById(sessionId!);
      setSession(sessionData);

      if (sessionData.status === 'completed') {
        navigate(`/session/${sessionId}/summary`);
        return;
      }

      // Check if session has reached target
      if (sessionData.attempts.length >= sessionData.target_question_count) {
        navigate(`/session/${sessionId}/summary`);
        return;
      }

      // Fetch or generate next question for this session
      const q = await questionApi.generate({
        role: sessionData.role,
        use_adaptive_difficulty: sessionData.difficulty_mode === 'adaptive',
      });
      setCurrentQuestion(q);
      setTimeRemaining(q.time_suggestion_sec || 180);
      setAnswerText('');
      setSpeechMetrics(null);
      setAudioDurationSec(null);

      // Start Countdown Timer
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        setTimeRemaining((prev) => (prev && prev > 0 ? prev - 1 : 0));
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to load interview session.');
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceTranscription = (transcript: string, durationSec: number, metrics: SpeechMetrics) => {
    setAnswerText(transcript);
    setAudioDurationSec(durationSec);
    setSpeechMetrics(metrics);
  };

  const handleSubmit = async () => {
    if (!answerText.trim() || !currentQuestion || !session) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // Simulate progressive feedback status messages
      const progressTimer = setInterval(() => {
        setEvalProgressStep((prev) => (prev < 3 ? prev + 1 : prev));
      }, 900);

      const attemptResult: Attempt = await attemptApi.submit({
        session_id: session.id,
        question_id: currentQuestion.id,
        answer_text: answerText,
        answer_mode: answerMode,
        audio_duration_sec: audioDurationSec,
        speech_metrics: speechMetrics as any,
      });

      clearInterval(progressTimer);
      navigate(`/session/${session.id}/feedback/${attemptResult.id}`);
    } catch (err: any) {
      setError(err.message || 'Evaluation failed. Please try submitting again.');
      setIsSubmitting(false);
    }
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        <p className="text-slate-400 font-medium">Preparing calibrated interview question...</p>
      </div>
    );
  }

  if (error && !currentQuestion) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Interview Session Error</h2>
        <p className="text-slate-400 text-sm">{error}</p>
        <button
          onClick={loadSession}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  const currentQuestionIndex = (session?.attempts.length || 0) + 1;
  const totalQuestions = session?.target_question_count || 5;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Session Header & Stepper */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {session?.role} Track
            </span>
            <span className="text-xs text-slate-500 capitalize">
              • {session?.difficulty_mode} Mode
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">
            Question {currentQuestionIndex} of {totalQuestions}
          </h1>
        </div>

        {/* Timer & Stepper Pill */}
        <div className="flex items-center space-x-3">
          {timeRemaining !== null && (
            <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-sm font-mono font-medium ${
              timeRemaining < 60 
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse' 
                : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}>
              <Clock className="w-4 h-4" />
              <span>{formatTimer(timeRemaining)}</span>
            </div>
          )}

          <div className="hidden sm:flex items-center space-x-1">
            {Array.from({ length: totalQuestions }).map((_, idx) => (
              <div
                key={idx}
                className={`w-6 h-2 rounded-full transition-all ${
                  idx < currentQuestionIndex - 1
                    ? 'bg-emerald-500'
                    : idx === currentQuestionIndex - 1
                    ? 'bg-indigo-500 w-8'
                    : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Question Card */}
      {currentQuestion && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 mb-8 shadow-xl relative overflow-hidden">
          <div className="flex items-center space-x-2 mb-3">
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 capitalize">
              {currentQuestion.category.replace('_', ' ')}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded capitalize ${
              currentQuestion.difficulty === 'easy'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : currentQuestion.difficulty === 'medium'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {currentQuestion.difficulty}
            </span>
            <span className="text-xs text-slate-500">
              Target time: ~{Math.round(currentQuestion.time_suggestion_sec / 60)} min
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-slate-100 leading-snug">
            {currentQuestion.question_text}
          </h2>
        </div>
      )}

      {/* Answer Mode Switcher */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Your Response
        </span>

        <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setAnswerMode('text')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              answerMode === 'text'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Written Text</span>
          </button>
          <button
            type="button"
            onClick={() => setAnswerMode('voice')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              answerMode === 'voice'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Voice & Audio</span>
          </button>
        </div>
      </div>

      {/* Answering Component Container */}
      <div className="space-y-6">
        {answerMode === 'voice' && (
          <div className="space-y-4">
            <AudioRecorder
              onTranscriptionComplete={handleVoiceTranscription}
              disabled={isSubmitting}
            />
            {speechMetrics && (
              <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs">
                <div className="flex items-center space-x-1 text-slate-300">
                  <span className="text-slate-500">Pace:</span>
                  <span className="font-mono font-semibold text-indigo-400">{Math.round(speechMetrics.wpm)} WPM</span>
                  {speechMetrics.optimal_pace ? (
                    <span className="text-emerald-400 font-semibold">(Optimal)</span>
                  ) : (
                    <span className="text-amber-400">(Adjust)</span>
                  )}
                </div>
                <div className="flex items-center space-x-1 text-slate-300">
                  <span className="text-slate-500">Filler Words:</span>
                  <span className="font-mono font-semibold text-amber-400">{speechMetrics.filler_word_count}</span>
                  {speechMetrics.filler_words.length > 0 && (
                    <span className="text-slate-500">({speechMetrics.filler_words.slice(0, 3).join(', ')})</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Text Area (always editable, allows candidate to review transcribed speech or type freely) */}
        <div>
          {answerMode === 'voice' && answerText && (
            <div className="flex items-center space-x-1 text-xs text-indigo-400 mb-2 font-medium">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Transcribed Audio — you can review and edit before submitting:</span>
            </div>
          )}
          <TextEditor
            value={answerText}
            onChange={setAnswerText}
            disabled={isSubmitting}
            minWords={15}
            timeSuggestionSec={currentQuestion?.time_suggestion_sec}
          />
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Submission Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-500">
            {isSubmitting ? (
              <span className="flex items-center space-x-2 text-indigo-400 animate-pulse">
                <Brain className="w-4 h-4" />
                <span>
                  {evalProgressStep === 0 && 'Analyzing answer structure & key points...'}
                  {evalProgressStep === 1 && 'Scoring technical accuracy against rubric...'}
                  {evalProgressStep === 2 && 'Calibrating delivery & communication metrics...'}
                  {evalProgressStep >= 3 && 'Synthesizing benchmark model answer...'}
                </span>
              </span>
            ) : (
              <span>Structured rubric evaluation with model answer will generate upon submission</span>
            )}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!answerText.trim() || isSubmitting}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl font-semibold text-sm shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Evaluating...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit for Evaluation</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
