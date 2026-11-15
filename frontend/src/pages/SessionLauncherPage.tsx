import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sessionApi } from '../api/client';
import { Role } from '../types';
import { 
  Play, 
  Sparkles, 
  Clock, 
  Zap, 
  ShieldCheck, 
  Layers, 
  HelpCircle,
  TrendingUp,
  BrainCircuit,
  Sliders
} from 'lucide-react';

const ROLES: Role[] = [
  'SDE',
  'Frontend Developer',
  'Backend Developer',
  'ML Engineer',
  'Data Analyst',
  'HR/Behavioral',
];

export const SessionLauncherPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Pick up pre-selected role or weak spot from query params or user profile
  const queryParams = new URLSearchParams(location.search);
  const initialRole = (queryParams.get('role') as Role) || user?.profile?.target_role || 'SDE';

  const [role, setRole] = useState<Role>(initialRole);
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [difficultyMode, setDifficultyMode] = useState<'adaptive' | 'fixed'>('adaptive');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const session = await sessionApi.create({
        title: `${role} Mock Interview`,
        role,
        target_question_count: questionCount,
        difficulty_mode: difficultyMode,
      });

      navigate(`/session/${session.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to start interview session. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="text-center mb-10 space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Calibrated Mock Interview Engine</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Configure Your Practice Session
        </h1>
        <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
          Practice high-yield questions customized for your target career track, evaluated against structured industry rubrics.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-sm flex items-center space-x-2">
          <HelpCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleStartSession} className="space-y-8">
        {/* Step 1: Target Role */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Target Role</span>
            </label>
            <span className="text-xs text-slate-500">Select candidate role track</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ROLES.map((r) => {
              const isSelected = role === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`p-3.5 rounded-xl border text-left text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-600/10'
                      : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold">{r}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {r === 'SDE' && 'DSA, Architecture, Algorithms'}
                    {r === 'Frontend Developer' && 'React, Web APIs, CSS, UI/UX'}
                    {r === 'Backend Developer' && 'APIs, Databases, Concurrency'}
                    {r === 'ML Engineer' && 'MLOps, Math, PyTorch, Models'}
                    {r === 'Data Analyst' && 'SQL, Pandas, Stats, Dashboards'}
                    {r === 'HR/Behavioral' && 'STAR Method, Conflict, Values'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Session Length */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Session Length</span>
            </label>
            <span className="text-xs text-slate-500">Target question count</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setQuestionCount(5)}
              className={`p-4 rounded-xl border text-left transition-all ${
                questionCount === 5
                  ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-md shadow-emerald-600/10'
                  : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-base">5 Questions</span>
                <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full font-mono">
                  ~15 - 20 mins
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Focused sprint session. Ideal for daily practice, warmups, or targeted topic reviews.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setQuestionCount(10)}
              className={`p-4 rounded-xl border text-left transition-all ${
                questionCount === 10
                  ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-md shadow-emerald-600/10'
                  : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-base">10 Questions</span>
                <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full font-mono">
                  ~35 - 45 mins
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Comprehensive interview simulation. Spans technical depth, problem solving, and behavioral questions.
              </p>
            </button>
          </div>
        </div>

        {/* Step 3: Difficulty Calibration Mode */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-purple-400" />
              <span>Difficulty Mode</span>
            </label>
            <span className="text-xs text-slate-500">Algorithm pacing</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setDifficultyMode('adaptive')}
              className={`p-4 rounded-xl border text-left transition-all ${
                difficultyMode === 'adaptive'
                  ? 'bg-purple-600/20 border-purple-500 text-white shadow-md shadow-purple-600/10'
                  : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BrainCircuit className="w-4 h-4 text-purple-400" />
                  <span className="font-bold text-base">Adaptive Pacing</span>
                </div>
                <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full font-semibold">
                  Recommended
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Questions dynamically scale up or down based on your recent 5-attempt moving average score.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setDifficultyMode('fixed')}
              className={`p-4 rounded-xl border text-left transition-all ${
                difficultyMode === 'fixed'
                  ? 'bg-purple-600/20 border-purple-500 text-white shadow-md shadow-purple-600/10'
                  : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-slate-400" />
                <span className="font-bold text-base">Standard Balanced</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Maintains a balanced distribution across Easy, Medium, and Hard calibrated questions.
              </p>
            </button>
          </div>
        </div>

        {/* Launch Button */}
        <div className="flex justify-center pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-base shadow-xl shadow-indigo-600/25 transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>{isLoading ? 'Preparing Interview Room...' : 'Begin Mock Interview'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
