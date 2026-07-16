import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-slate-900/80 border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2 group">
              <span className="font-display font-bold text-xl tracking-tight bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent group-hover:from-indigo-300 group-hover:to-violet-300 transition-all">
                AI Task Platform
              </span>
            </Link>
            <div className="hidden md:flex space-x-4">
              <Link
                to="/"
                className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-all"
              >
                Dashboard
              </Link>
              <Link
                to="/tasks/new"
                className="bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 px-3 py-2 rounded-md text-sm font-medium border border-indigo-500/20 transition-all"
              >
                + New Task
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-slate-200">{user.name}</span>
              <span className="text-xs text-slate-400">{user.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-white px-3 py-2 rounded-md text-sm font-medium border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
