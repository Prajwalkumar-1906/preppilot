import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionApi } from '../api/client';
import { Session, SessionAttemptSummary } from '../types';
import { 
  Award, 
  CheckCircle2, 
  ArrowUpRight, 
  TrendingUp, 
  Target, 
  RotateCcw, 
  LayoutDashboard, 
  Loader2, 
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';

export const SessionSummaryPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      loadSession();
    }
  }, [sessionId]);

  const loadSession = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await sessionApi.getById(sessionId!);
      setSession(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load session summary.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        <p className="text-slate-400 font-medium">Computing session scorecard and analytics...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Summary Not Available</h2>
        <p className="text-slate-400 text-sm">{error || 'Session could not be retrieved.'}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const durationMin = Math.max(1, Math.round(session.total_duration_sec / 60));
  const avgScore = session.overall_score || 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Celebration Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>Session Completed Successfully</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          {session.title} Scorecard
        </h1>
        <p className="text-slate-400 text-sm sm:text-base">
          Target Track: <span className="text-indigo-400 font-semibold">{session.role}</span> • {session.attempts.length} Questions Answered in ~{durationMin} mins
        </p>
      </div>

      {/* Main KPI Score Card */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Big Score Dial */}
          <div className="flex flex-col items-center justify-center text-center md:border-r border-slate-800 md:pr-6">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Composite Session Score
            </span>
            <div className="text-5xl font-extrabold text-white tracking-tight">
              {avgScore.toFixed(1)}
              <span className="text-2xl font-normal text-slate-500">/10</span>
            </div>
            <span className="text-xs text-indigo-400 font-medium mt-2">
              {avgScore >= 8.0 && 'Excellent performance! High interview readiness.'}
              {avgScore >= 6.0 && avgScore < 8.0 && 'Solid foundation. Targeted practice advised.'}
              {avgScore < 6.0 && 'Good practice sprint. Review key missed concepts.'}
            </span>
          </div>

          {/* Quick Metrics */}
          <div className="md:col-span-2 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center space-x-2 text-slate-400 text-xs mb-1">
                  <Target className="w-4 h-4 text-emerald-400" />
                  <span>Completion Rate</span>
                </div>
                <div className="text-xl font-bold text-white">
                  {session.attempts.length} / {session.target_question_count} (100%)
                </div>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center space-x-2 text-slate-400 text-xs mb-1">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span>Total Duration</span>
                </div>
                <div className="text-xl font-bold text-white">
                  {durationMin} min
                </div>
              </div>
            </div>

            {/* Recommended Focus Area */}
            {session.recommended_focus && (
              <div className="bg-indigo-600/10 border border-indigo-500/20 p-4 rounded-xl flex items-start space-x-3">
                <Sparkles className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                    Recommended Next Focus
                  </div>
                  <div className="text-xs sm:text-sm text-slate-200 mt-0.5">
                    {session.recommended_focus}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Aggregate Strengths vs Growth Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-2 mb-4">
            <CheckCircle2 className="w-4 h-4" />
            <span>Key Demonstrated Strengths</span>
          </h3>
          <ul className="space-y-3">
            {session.summary_strengths && session.summary_strengths.length > 0 ? (
              session.summary_strengths.map((str: string, idx: number) => (
                <li key={idx} className="flex items-start space-x-2 text-xs sm:text-sm text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                  <span>{str}</span>
                </li>
              ))
            ) : (
              <li className="text-xs text-slate-500 italic">No specific strengths recorded.</li>
            )}
          </ul>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-2 mb-4">
            <TrendingUp className="w-4 h-4" />
            <span>Target Areas to Refine</span>
          </h3>
          <ul className="space-y-3">
            {session.summary_improvements && session.summary_improvements.length > 0 ? (
              session.summary_improvements.map((imp: string, idx: number) => (
                <li key={idx} className="flex items-start space-x-2 text-xs sm:text-sm text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                  <span>{imp}</span>
                </li>
              ))
            ) : (
              <li className="text-xs text-slate-500 italic">No major weaknesses identified.</li>
            )}
          </ul>
        </div>
      </div>

      {/* Question by Question Review Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
          Questions in this Session
        </h3>

        <div className="divide-y divide-slate-800">
          {session.attempts.map((att: SessionAttemptSummary, idx: number) => (
            <div key={att.id} className="py-3.5 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
                  <span>Question {idx + 1}</span>
                  <span>•</span>
                  <span className="capitalize">{att.question?.category?.replace('_', ' ') || 'General'}</span>
                  <span>•</span>
                  <span className="capitalize">{att.answer_mode}</span>
                </div>
                <div className="text-sm font-medium text-slate-200 truncate">
                  {att.question?.question_text || 'Mock question'}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <span className="text-sm font-bold text-indigo-400 font-mono">
                  {att.evaluation ? `${att.evaluation.overall_score.toFixed(1)}/10` : '—'}
                </span>
                <button
                  type="button"
                  onClick={() => navigate(`/session/${session.id}/feedback/${att.id}`)}
                  className="flex items-center space-x-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <span>Review</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <button
          type="button"
          onClick={() => navigate('/session/new')}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-indigo-600/20 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Start Another Practice Session</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-semibold text-sm transition-all"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </button>
      </div>
    </div>
  );
};
