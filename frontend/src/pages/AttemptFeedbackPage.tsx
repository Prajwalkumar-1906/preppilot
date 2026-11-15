import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { attemptApi, sessionApi } from '../api/client';
import { Attempt, Session } from '../types';
import { 
  Award, 
  CheckCircle2, 
  XCircle, 
  Lightbulb, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  BookOpen, 
  Volume2, 
  Loader2, 
  Check, 
  AlertTriangle 
} from 'lucide-react';

export const AttemptFeedbackPage: React.FC = () => {
  const { sessionId, attemptId } = useParams<{ sessionId: string; attemptId: string }>();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (attemptId) {
      loadAttemptAndSession();
    }
  }, [attemptId, sessionId]);

  const loadAttemptAndSession = async () => {
    try {
      setLoading(true);
      setError(null);
      const [attemptData, sessionData] = await Promise.all([
        attemptApi.getById(attemptId!),
        sessionId ? sessionApi.getById(sessionId) : Promise.resolve(null),
      ]);
      setAttempt(attemptData);
      setSession(sessionData);
    } catch (err: any) {
      setError(err.message || 'Failed to load feedback.');
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = async () => {
    if (!session || !sessionId) {
      navigate('/dashboard');
      return;
    }

    const currentCount = session.attempts.length;
    const isLastQuestion = currentCount >= session.target_question_count;

    if (isLastQuestion) {
      try {
        setIsCompleting(true);
        await sessionApi.complete(sessionId);
        navigate(`/session/${sessionId}/summary`);
      } catch (err: any) {
        // If already completed, just navigate to summary
        navigate(`/session/${sessionId}/summary`);
      }
    } else {
      navigate(`/session/${sessionId}`);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8.0) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 6.0) return 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10';
    if (score >= 4.0) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  const getBarColor = (score: number) => {
    if (score >= 8.0) return 'bg-emerald-500';
    if (score >= 6.0) return 'bg-indigo-500';
    if (score >= 4.0) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        <p className="text-slate-400 font-medium">Loading rubric evaluation & feedback...</p>
      </div>
    );
  }

  if (error || !attempt || !attempt.evaluation) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Feedback Not Found</h2>
        <p className="text-slate-400 text-sm">{error || 'Unable to retrieve evaluation record.'}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const evaluation = attempt.evaluation;
  const currentCount = session?.attempts.length || 1;
  const targetCount = session?.target_question_count || 5;
  const isLastQuestion = currentCount >= targetCount;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Top Banner / Question Context */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {attempt.question?.role_tag || 'Interview'}
            </span>
            <span className="text-xs text-slate-400 capitalize">
              • {attempt.question?.category?.replace('_', ' ')}
            </span>
            <span className="text-xs text-slate-500 capitalize">
              • {attempt.question?.difficulty}
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Prompt v{evaluation.prompt_version} ({evaluation.model_name})
          </span>
        </div>
        <h1 className="text-lg font-bold text-slate-100">
          {attempt.question?.question_text}
        </h1>
      </div>

      {/* Main Score & Rubric Dimensions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Overall Score Dial */}
        <div className="md:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-lg">
          <Award className="w-8 h-8 text-indigo-400 mb-2" />
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Overall Score
          </div>
          <div className={`text-4xl font-extrabold px-4 py-1.5 rounded-2xl border ${getScoreColor(evaluation.overall_score)}`}>
            {evaluation.overall_score.toFixed(1)}
            <span className="text-lg font-normal text-slate-500">/10</span>
          </div>
          <div className="text-xs text-slate-400 mt-3">
            {evaluation.overall_score >= 8.0 && 'Strong hire caliber'}
            {evaluation.overall_score >= 6.0 && evaluation.overall_score < 8.0 && 'Competitive answer'}
            {evaluation.overall_score < 6.0 && 'Needs refinement'}
          </div>
        </div>

        {/* Dimension Breakdown */}
        <div className="md:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-center space-y-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Rubric Dimensions
          </div>

          <div className="space-y-3">
            {/* Clarity */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-300">Clarity & Structure</span>
                <span className="font-mono text-indigo-400">{evaluation.clarity_score.toFixed(1)} / 10</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${getBarColor(evaluation.clarity_score)}`}
                  style={{ width: `${Math.min(100, evaluation.clarity_score * 10)}%` }}
                />
              </div>
            </div>

            {/* Relevance */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-300">Relevance to Question</span>
                <span className="font-mono text-indigo-400">{evaluation.relevance_score.toFixed(1)} / 10</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${getBarColor(evaluation.relevance_score)}`}
                  style={{ width: `${Math.min(100, evaluation.relevance_score * 10)}%` }}
                />
              </div>
            </div>

            {/* Technical */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-300">Technical Depth & Accuracy</span>
                <span className="font-mono text-indigo-400">{evaluation.technical_score.toFixed(1)} / 10</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${getBarColor(evaluation.technical_score)}`}
                  style={{ width: `${Math.min(100, evaluation.technical_score * 10)}%` }}
                />
              </div>
            </div>

            {/* Communication (if evaluated) */}
            {evaluation.communication_score !== null && evaluation.communication_score !== undefined && (
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-slate-300">Communication & Delivery (Voice)</span>
                  <span className="font-mono text-indigo-400">{evaluation.communication_score.toFixed(1)} / 10</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${getBarColor(evaluation.communication_score)}`}
                    style={{ width: `${Math.min(100, evaluation.communication_score * 10)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Strengths & Missed Points Badges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm mb-4">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>Demonstrated Strengths</span>
          </div>
          <ul className="space-y-2.5">
            {evaluation.strengths.map((str: string, idx: number) => (
              <li key={idx} className="flex items-start space-x-2 text-xs sm:text-sm text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                <span>{str}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Missed Key Points / Weaknesses */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm mb-4">
            <XCircle className="w-5 h-5 flex-shrink-0" />
            <span>Missed Key Points & Refinements</span>
          </div>
          <ul className="space-y-2.5">
            {evaluation.missed_key_points.map((pt: string, idx: number) => (
              <li key={idx} className="flex items-start space-x-2 text-xs sm:text-sm text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Actionable Suggestions */}
      {evaluation.actionable_suggestions.length > 0 && (
        <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm mb-3">
            <Lightbulb className="w-5 h-5 flex-shrink-0" />
            <span>Actionable Advice for Next Attempt</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {evaluation.actionable_suggestions.map((sug: string, idx: number) => (
              <div key={idx} className="bg-slate-900/60 p-3 rounded-xl border border-indigo-500/10 text-xs text-slate-300">
                {sug}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Side-by-Side: Your Answer vs Model Answer */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-200 font-bold text-base">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <span>Side-by-Side Comparison</span>
          </div>
          {attempt.answer_mode === 'voice' && attempt.speech_metrics && (
            <div className="flex items-center space-x-2 text-xs bg-slate-800/80 px-2.5 py-1 rounded-lg text-slate-300">
              <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                Pace: {Math.round(attempt.speech_metrics.wpm || 0)} WPM • Fillers: {attempt.speech_metrics.filler_word_count || 0}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Your Answer */}
          <div className="flex flex-col space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Your Answer ({attempt.answer_mode === 'voice' ? 'Transcribed Audio' : 'Written Text'})
            </div>
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-xs sm:text-sm text-slate-300 leading-relaxed min-h-[140px] whitespace-pre-wrap">
              {attempt.answer_text}
            </div>
          </div>

          {/* Model Answer */}
          <div className="flex flex-col space-y-2">
            <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Exemplary Model Answer</span>
            </div>
            <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-4 text-xs sm:text-sm text-slate-200 leading-relaxed min-h-[140px] whitespace-pre-wrap font-sans">
              {evaluation.improved_model_answer}
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Reasoning Accordion */}
      {evaluation.reasoning && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <button
            type="button"
            onClick={() => setShowReasoning(!showReasoning)}
            className="w-full p-4 flex items-center justify-between text-left text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span>Evaluator Chain-of-Thought Rationale</span>
            {showReasoning ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showReasoning && (
            <div className="p-4 bg-slate-950/80 border-t border-slate-800 text-xs text-slate-400 leading-relaxed font-mono">
              {evaluation.reasoning}
            </div>
          )}
        </div>
      )}

      {/* Bottom Navigation CTA */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          Exit to Dashboard
        </button>

        <button
          type="button"
          onClick={handleNextStep}
          disabled={isCompleting}
          className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
        >
          {isCompleting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Finalizing Session Scorecard...</span>
            </>
          ) : isLastQuestion ? (
            <>
              <span>Finish Session & View Report</span>
              <ArrowRight className="w-4 h-4" />
            </>
          ) : (
            <>
              <span>Continue to Next Question</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
