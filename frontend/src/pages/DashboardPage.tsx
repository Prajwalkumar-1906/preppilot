import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { questionApi, analyticsApi, sessionApi } from '../api/client';
import { Question } from '../types';
import { 
  PlayCircle, 
  Target, 
  Award, 
  Sparkles, 
  BookOpen, 
  Clock, 
  Flame, 
  Layers, 
  Volume2, 
  TrendingUp, 
  BrainCircuit, 
  AlertCircle, 
  CheckCircle2, 
  ArrowUpRight,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

const CATEGORIES = [
  { id: '', label: 'All Categories' },
  { id: 'dsa_concepts', label: 'DSA Concepts' },
  { id: 'technical', label: 'Technical Depth' },
  { id: 'system_design_basics', label: 'System Design' },
  { id: 'behavioral', label: 'Behavioral' },
  { id: 'hr', label: 'HR & Culture' },
  { id: 'project_based', label: 'Project Deep-Dive' },
];

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'analytics' | 'questions' | 'history'>('analytics');

  // Question bank state
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);

  // Queries
  const { data: overview } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => analyticsApi.getOverview(),
  });

  const { data: trends } = useQuery({
    queryKey: ['analytics-trends'],
    queryFn: () => analyticsApi.getTrends(30),
  });

  const { data: categories } = useQuery({
    queryKey: ['analytics-categories'],
    queryFn: () => analyticsApi.getCategories(),
  });

  const { data: radar } = useQuery({
    queryKey: ['analytics-radar'],
    queryFn: () => analyticsApi.getRadar(),
  });

  const { data: speech } = useQuery({
    queryKey: ['analytics-speech'],
    queryFn: () => analyticsApi.getSpeech(),
  });

  const { data: weakSpots } = useQuery({
    queryKey: ['analytics-weak-spots'],
    queryFn: () => analyticsApi.getWeakSpots(),
  });

  const { data: recentSessions } = useQuery({
    queryKey: ['user-sessions'],
    queryFn: () => sessionApi.list(),
  });

  const { data: questionData, isLoading: questionsLoading } = useQuery({
    queryKey: ['questions', user?.profile?.target_role, selectedCategory, selectedDifficulty],
    queryFn: () =>
      questionApi.list({
        role: user?.profile?.target_role || 'SDE',
        category: selectedCategory || undefined,
        difficulty: selectedDifficulty || undefined,
        limit: 50,
      }),
  });

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'easy':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'medium':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'hard':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Hero Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-8 overflow-hidden shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Target Role: {user?.profile?.target_role || 'SDE'}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Welcome back, {user?.full_name?.split(' ')[0] || 'Candidate'}!
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Practice realistic AI mock interviews tailored for fresh graduates. Select a role, answer via typing or voice, and receive instant rubric-scored feedback with model answers.
          </p>
          <div className="pt-2 flex flex-wrap gap-4">
            <Link
              to="/session/new"
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition-all"
            >
              <PlayCircle className="w-5 h-5" />
              Launch Mock Interview
            </Link>
          </div>
        </div>
      </div>

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Streak */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Practice Streak</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {overview?.streak_days || 0} <span className="text-sm font-normal text-slate-400">days</span>
          </div>
        </div>

        {/* Total Sessions */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Sessions</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {overview?.total_sessions || 0}
          </div>
        </div>

        {/* Questions Answered */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Questions</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {overview?.total_questions || 0}
          </div>
        </div>

        {/* Practice Time */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Time Spent</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {overview?.total_minutes || 0} <span className="text-sm font-normal text-slate-400">min</span>
          </div>
        </div>

        {/* Average Score */}
        <div className="col-span-2 lg:col-span-1 bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Avg Score</span>
            <Award className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-indigo-400">
            {overview?.average_score ? `${overview.average_score.toFixed(1)}/10` : '—'}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center border-b border-slate-800 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 text-sm font-semibold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'analytics'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Analytics & Progress</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('questions')}
          className={`pb-3 text-sm font-semibold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'questions'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Question Bank (50+ Curated)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-sm font-semibold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'history'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Recent Sessions</span>
        </button>
      </div>

      {/* TAB 1: Analytics & Progress */}
      {activeTab === 'analytics' && (
        <div className="space-y-8">
          {/* Weak Spots Actionable Alert Card */}
          {weakSpots && weakSpots.length > 0 && (
            <div className="bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/20 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4" />
                  <span>Targeted Practice Opportunity</span>
                </div>
                <h3 className="text-base font-bold text-white">
                  Weak Spot Detected: {weakSpots[0].category.replace('_', ' ').toUpperCase()} (Avg: {weakSpots[0].average_score.toFixed(1)}/10)
                </h3>
                <p className="text-xs text-slate-400 max-w-2xl">
                  {weakSpots[0].recommendation}
                </p>
              </div>

              <Link
                to={`/session/new?role=${weakSpots[0].role_tag}`}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all flex-shrink-0 shadow-lg shadow-amber-500/20"
              >
                <span>Practice This Weak Spot</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Charts Row 1: Score Trajectory & Radar Profile */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Score Trajectory Line Chart */}
            <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Score Trajectory Over Time
                  </h3>
                  <p className="text-xs text-slate-400">
                    Daily overall, technical, clarity, and relevance scores
                  </p>
                </div>
              </div>

              <div className="h-64 w-full">
                {trends && trends.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                      <YAxis domain={[0, 10]} stroke="#64748b" fontSize={11} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Line type="monotone" dataKey="overall_score" name="Overall" stroke="#818cf8" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="technical_score" name="Technical" stroke="#10b981" strokeWidth={1.5} dot={false} />
                      <Line type="monotone" dataKey="clarity_score" name="Clarity" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                      <Line type="monotone" dataKey="relevance_score" name="Relevance" stroke="#ec4899" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500">
                    Complete mock interviews to track your trajectory chart.
                  </div>
                )}
              </div>
            </div>

            {/* 6-Axis Skill Radar */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Skill Mastery Profile
                </h3>
                <p className="text-xs text-slate-400">
                  Current mastery vs 30-day baseline
                </p>
              </div>

              <div className="h-64 w-full">
                {radar && radar.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radar}>
                      <PolarGrid stroke="#334155" />
                      <PolarAngleAxis dataKey="skill" stroke="#94a3b8" fontSize={10} />
                      <PolarRadiusAxis domain={[0, 10]} stroke="#475569" fontSize={9} />
                      <Radar name="Recent (30d)" dataKey="recent_30d" stroke="#818cf8" fill="#818cf8" fillOpacity={0.4} />
                      <Radar name="All Time" dataKey="all_time" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500">
                    No radar points recorded yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Charts Row 2: Category Mastery & Speech Delivery */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Performance Bar Chart */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Performance by Category
                </h3>
                <p className="text-xs text-slate-400">
                  Average score across interview categories
                </p>
              </div>

              <div className="h-60 w-full">
                {categories && categories.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categories} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <XAxis dataKey="category" stroke="#64748b" fontSize={10} interval={0} angle={-25} textAnchor="end" />
                      <YAxis domain={[0, 10]} stroke="#64748b" fontSize={11} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                      />
                      <Bar dataKey="average_score" name="Avg Score" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500">
                    No category data available.
                  </div>
                )}
              </div>
            </div>

            {/* Speech Delivery Health Panel */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <Volume2 className="w-4 h-4 text-indigo-400" />
                  <span>Speech & Communication Delivery</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Voice answer pacing, filler frequencies, and speech clarity
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-xs text-slate-400 mb-1">Average Speaking Pace</div>
                  <div className="text-2xl font-bold text-white">
                    {speech?.average_wpm ? `${Math.round(speech.average_wpm)}` : '—'} <span className="text-xs font-normal text-slate-500">WPM</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Optimal target: 130–165 WPM</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-xs text-slate-400 mb-1">Pace Stability Rate</div>
                  <div className="text-2xl font-bold text-emerald-400">
                    {speech?.optimal_pace_percentage !== undefined ? `${Math.round(speech.optimal_pace_percentage)}%` : '—'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Answers in optimal cadence</div>
                </div>
              </div>

              {/* Filler Words frequency breakdown */}
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Top Detected Filler Words
                </div>
                {speech?.top_filler_words && speech.top_filler_words.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {speech.top_filler_words.map((item, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-slate-800 text-amber-300 rounded-lg text-xs font-mono border border-amber-500/20"
                      >
                        "{item.word}": {item.count}×
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic">
                    {speech?.total_voice_attempts ? 'Zero filler words detected! Clean delivery.' : 'Answer via voice to generate speech metrics.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Question Bank Explorer */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              {['', 'easy', 'medium', 'hard'].map((diff) => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                    selectedDifficulty === diff
                      ? 'bg-slate-700 text-white border border-slate-600'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {diff || 'All Levels'}
                </button>
              ))}
            </div>
          </div>

          {/* Question List */}
          {questionsLoading ? (
            <div className="text-center py-12 text-slate-500 text-sm">Loading questions...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {questionData?.items.map((q) => (
                <div
                  key={q.id}
                  onClick={() => setActiveQuestion(q)}
                  className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400 capitalize">
                      {q.category.replace('_', ' ')}
                    </span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full border capitalize ${getDifficultyColor(q.difficulty)}`}>
                      {q.difficulty}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-100 line-clamp-2">
                    {q.question_text}
                  </h4>
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>Target: ~{Math.round(q.time_suggestion_sec / 60)} min</span>
                    <span className="text-indigo-400 hover:underline">Inspect Rubric Key Points →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Recent Sessions */}
      {activeTab === 'history' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Practice Session History
          </h3>

          <div className="divide-y divide-slate-800">
            {recentSessions && recentSessions.length > 0 ? (
              recentSessions.map((s) => (
                <div key={s.id} className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
                      <span className="font-semibold text-slate-400">{s.role}</span>
                      <span>•</span>
                      <span>{new Date(s.started_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <span className="capitalize">{s.difficulty_mode}</span>
                    </div>
                    <div className="text-sm font-bold text-slate-200">
                      {s.title}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-indigo-400 font-mono">
                        {s.overall_score ? `${s.overall_score.toFixed(1)}/10` : 'In Progress'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {s.attempts.length}/{s.target_question_count} questions
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate(s.status === 'completed' ? `/session/${s.id}/summary` : `/session/${s.id}`)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
                    >
                      {s.status === 'completed' ? 'Scorecard' : 'Resume'}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-xs text-slate-500">
                No mock interview sessions recorded yet. Click "Launch Mock Interview" to begin!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Question Detail Modal (for reviewing key rubric points) */}
      {activeQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className={`text-xs px-2.5 py-0.5 rounded-full border capitalize ${getDifficultyColor(activeQuestion.difficulty)}`}>
                {activeQuestion.difficulty} • {activeQuestion.category.replace('_', ' ')}
              </span>
              <button
                onClick={() => setActiveQuestion(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <h3 className="text-base font-bold text-white leading-snug">
              {activeQuestion.question_text}
            </h3>

            <div className="space-y-3">
              <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Expected Key Points (Rubric Benchmark)
              </div>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {activeQuestion.expected_key_points.map((pt, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
                Common Candidate Pitfalls
              </div>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {activeQuestion.common_mistakes.map((m, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActiveQuestion(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
