import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, LogOut, User as UserIcon, BarChart3, PlayCircle } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/30 transition-all">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Interview Coach
            </span>
            <span className="block text-[10px] tracking-wider font-semibold uppercase text-emerald-400">
              AI Real-Time Mock
            </span>
          </div>
        </Link>

        {/* Center Nav Items */}
        {user && (
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors"
            >
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              Dashboard
            </Link>
            <Link
              to="/session/new"
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors"
            >
              <PlayCircle className="w-4 h-4 text-emerald-400" />
              Start Mock Interview
            </Link>
          </nav>
        )}

        {/* User Right Profile / Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-sm font-semibold text-slate-200">{user.full_name}</span>
                <span className="text-xs text-slate-400 font-mono">
                  {user.profile?.target_role || 'Candidate'} · {user.profile?.experience_level || 'fresher'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Log out"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold shadow-md shadow-emerald-500/20 transition-all"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
