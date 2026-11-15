import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Mail, Lock, User, Briefcase, GraduationCap, Loader2, AlertCircle, Plus, X } from 'lucide-react';

const SUGGESTED_TECH = [
  'Python', 'FastAPI', 'React', 'TypeScript', 'SQL / PostgreSQL',
  'Data Structures & Algorithms', 'System Design', 'Docker',
  'Machine Learning', 'Node.js', 'Pandas / NumPy'
];

export const RegisterPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [targetRole, setTargetRole] = useState('SDE');
  const [experienceLevel, setExperienceLevel] = useState('fresher');
  const [techFocusAreas, setTechFocusAreas] = useState<string[]>(['Python', 'DSA']);
  const [customTech, setCustomTech] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleToggleTech = (tech: string) => {
    if (techFocusAreas.includes(tech)) {
      setTechFocusAreas(techFocusAreas.filter((t) => t !== tech));
    } else {
      setTechFocusAreas([...techFocusAreas, tech]);
    }
  };

  const handleAddCustomTech = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && customTech.trim()) {
      e.preventDefault();
      if (!techFocusAreas.includes(customTech.trim())) {
        setTechFocusAreas([...techFocusAreas, customTech.trim()]);
      }
      setCustomTech('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await register({
        full_name: fullName,
        email,
        password,
        target_role: targetRole,
        experience_level: experienceLevel,
        tech_focus_areas: techFocusAreas,
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />

        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-4">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Create Candidate Profile</h1>
          <p className="text-sm text-slate-400 mt-1">
            Tailor AI mock interviews to your target role and tech stack
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@alumni.edu"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Role and Experience */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-emerald-400" /> Target Role
              </label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="SDE">Software Development Engineer (SDE)</option>
                <option value="Frontend Developer">Frontend Developer</option>
                <option value="Backend Developer">Backend Developer</option>
                <option value="ML Engineer">Machine Learning Engineer</option>
                <option value="Data Analyst">Data Analyst</option>
                <option value="HR/Behavioral">HR & Behavioral Practice</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-400" /> Experience Level
              </label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="fresher">Fresher / New Graduate</option>
                <option value="0-2 yrs">0–2 Years Experience (Junior)</option>
              </select>
            </div>
          </div>

          {/* Tech Focus Areas */}
          <div className="pt-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Tech Focus Areas (Selected: {techFocusAreas.length})
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {SUGGESTED_TECH.map((tech) => {
                const isSelected = techFocusAreas.includes(tech);
                return (
                  <button
                    key={tech}
                    type="button"
                    onClick={() => handleToggleTech(tech)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {tech}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              value={customTech}
              onChange={(e) => setCustomTech(e.target.value)}
              onKeyDown={handleAddCustomTech}
              placeholder="Type custom skill and press Enter..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full !mt-6 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-60 transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Profile...
              </>
            ) : (
              'Create Account & Start Practicing'
            )}
          </button>
        </form>

        <p className="text-xs text-center text-slate-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-400 hover:underline font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
