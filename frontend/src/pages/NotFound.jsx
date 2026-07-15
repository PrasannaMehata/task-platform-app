import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4 font-sans text-center">
      <h1 className="font-display text-9xl font-extrabold text-indigo-500 tracking-widest animate-bounce">
        404
      </h1>
      <div className="bg-indigo-600 px-2 text-sm rounded rotate-12 absolute mb-16 font-mono text-white">
        Page Not Found
      </div>
      <h2 className="mt-8 text-2xl font-bold text-slate-200">
        Lost in deep space
      </h2>
      <p className="mt-2 text-slate-400 max-w-sm">
        The page you are looking for does not exist or has been moved.
      </p>
      <div className="mt-6">
        <Link
          to="/"
          className="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-all transform hover:scale-[1.02] cursor-pointer"
        >
          ← Return Dashboard
        </Link>
      </div>
    </div>
  );
}
