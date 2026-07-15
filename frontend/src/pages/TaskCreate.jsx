import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

export default function TaskCreate() {
  const [title, setTitle] = useState('');
  const [inputText, setInputText] = useState('');
  const [operationType, setOperationType] = useState('reverse_string');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !inputText.trim()) {
      setError('Title and Input Text are required.');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      // 1. Create the task
      const createRes = await api.post('/api/tasks', {
        title,
        inputText,
        operationType,
      });

      if (createRes.data && createRes.data.success) {
        const taskId = createRes.data.task._id;
        
        // 2. Trigger the task run immediately
        await api.post(`/api/tasks/${taskId}/run`);

        // 3. Redirect to detail polling page
        navigate(`/tasks/${taskId}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create and queue the task.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      {/* Breadcrumbs */}
      <div className="mb-6">
        <Link to="/" className="text-slate-400 hover:text-white text-sm transition-all">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Create String Processing Job
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Define a new processing task and queue it for background workers.
          </p>
        </div>
      </div>

      <div className="backdrop-blur-md bg-slate-800/20 border border-slate-850 py-8 px-6 shadow-xl rounded-2xl sm:px-10">
        {error && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl p-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-300">
              Task Title
            </label>
            <div className="mt-1.5">
              <input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Reverse User Names"
                className="appearance-none block w-full px-4 py-3 border border-slate-700 bg-slate-900/60 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              A short description to identify this task in the dashboard.
            </p>
          </div>

          <div>
            <label htmlFor="operationType" className="block text-sm font-medium text-slate-300">
              Operation Type
            </label>
            <div className="mt-1.5">
              <select
                id="operationType"
                value={operationType}
                onChange={(e) => setOperationType(e.target.value)}
                className="block w-full px-4 py-3 border border-slate-700 bg-slate-900/60 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all cursor-pointer"
              >
                <option value="uppercase">Uppercase (A-Z)</option>
                <option value="lowercase">Lowercase (a-z)</option>
                <option value="reverse_string">Reverse String (z-a)</option>
                <option value="word_count">Word Count (Length)</option>
              </select>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              The transformation worker logic that will run on the input.
            </p>
          </div>

          <div>
            <label htmlFor="inputText" className="block text-sm font-medium text-slate-300">
              Input Text
            </label>
            <div className="mt-1.5">
              <textarea
                id="inputText"
                required
                rows={6}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type or paste the text you want the worker to process..."
                className="appearance-none block w-full px-4 py-3 border border-slate-700 bg-slate-900/60 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono transition-all"
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Text payloads are securely transformed by running jobs in the Redis Stream queue.
            </p>
          </div>

          <div className="flex items-center justify-end space-x-3 border-t border-slate-800 pt-6">
            <Link
              to="/"
              className="inline-flex items-center px-4 py-2.5 border border-slate-700 rounded-xl text-sm font-medium text-slate-300 bg-slate-800/40 hover:bg-slate-800/80 transition-all cursor-pointer"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-6 py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Queuing Job...
                </span>
              ) : (
                'Run Transformation Job'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
