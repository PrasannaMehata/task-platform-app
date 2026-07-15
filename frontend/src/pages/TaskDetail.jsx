import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import Timeline from '../components/Timeline';

export default function TaskDetail() {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryLoading, setRetryLoading] = useState(false);
  
  const pollingRef = useRef(null);

  const fetchTaskDetails = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const response = await api.get(`/api/tasks/${id}`);
      if (response.data && response.data.success) {
        setTask(response.data.task);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to retrieve task details.');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [id]);

  // Handle Polling Loop
  useEffect(() => {
    fetchTaskDetails(true);

    // Set up polling interval
    pollingRef.current = setInterval(() => {
      fetchTaskDetails(false);
    }, 1500);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchTaskDetails]);

  // Stop polling once task reaches a terminal state (success or failed)
  useEffect(() => {
    if (task && (task.status === 'success' || task.status === 'failed')) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
  }, [task]);

  const handleRetry = async () => {
    setError('');
    setRetryLoading(true);
    try {
      const response = await api.post(`/api/tasks/${id}/run`);
      if (response.data && response.data.success) {
        setTask(response.data.task);
        
        // Re-enable polling
        if (!pollingRef.current) {
          pollingRef.current = setInterval(() => {
            fetchTaskDetails(false);
          }, 1500);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to trigger retry run.');
    } finally {
      setRetryLoading(false);
    }
  };

  const getOperationLabel = (op) => {
    const labels = {
      uppercase: 'Uppercase',
      lowercase: 'Lowercase',
      reverse_string: 'Reverse String',
      word_count: 'Word Count',
    };
    return labels[op] || op;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center font-sans">
        <svg className="animate-spin h-12 w-12 text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="mt-4 text-slate-400 text-sm">Loading task details...</span>
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center font-sans">
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-semibold mb-2">Error Loading Task</h3>
          <p className="text-sm">{error}</p>
        </div>
        <Link to="/" className="text-indigo-400 hover:text-indigo-300 font-medium">
          ← Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      {/* Breadcrumbs */}
      <div className="mb-6 flex justify-between items-center">
        <Link to="/" className="text-slate-400 hover:text-white text-sm transition-all">
          ← Back to Dashboard
        </Link>
        {task && (task.status === 'success' || task.status === 'failed') && (
          <button
            onClick={handleRetry}
            disabled={retryLoading}
            className="inline-flex items-center px-4 py-2 border border-indigo-500/30 rounded-xl text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            {retryLoading ? 'Retrying...' : 'Re-Run Task'}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl p-4">
          {error}
        </div>
      )}

      {task && (
        <div className="space-y-6">
          {/* Header Info */}
          <div className="backdrop-blur-md bg-slate-800/10 border border-slate-800/60 rounded-2xl p-6 shadow-md md:flex md:items-center md:justify-between">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="font-display text-2xl font-extrabold text-white tracking-tight sm:text-3xl">
                  {task.title}
                </h1>
                <StatusBadge status={task.status} />
              </div>
              <p className="mt-2 text-xs text-slate-500 font-mono">
                TASK ID: {task._id} | CREATED: {new Date(task.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="mt-4 md:mt-0 bg-slate-900/60 border border-slate-700/30 rounded-xl px-4 py-2.5 text-center">
              <span className="block text-xs text-slate-500 uppercase tracking-wide font-semibold">Operation</span>
              <span className="text-sm font-medium text-indigo-400">{getOperationLabel(task.operationType)}</span>
            </div>
          </div>

          {/* Grid Layout: Payloads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input Text Card */}
            <div className="backdrop-blur-md bg-slate-800/20 border border-slate-850 rounded-2xl p-6 flex flex-col h-full shadow-md">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">Input Payload</h3>
              <div className="flex-1 bg-slate-900/60 border border-slate-800 rounded-xl p-4 font-mono text-sm text-slate-300 min-h-[160px] whitespace-pre-wrap break-all shadow-inner overflow-y-auto max-h-[250px]">
                {task.inputText}
              </div>
            </div>

            {/* Output Result Card */}
            <div className="backdrop-blur-md bg-slate-800/20 border border-slate-850 rounded-2xl p-6 flex flex-col h-full shadow-md">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">Processing Output</h3>
              
              {task.status === 'success' ? (
                <div className="flex-1 flex flex-col">
                  <div className="flex-1 bg-indigo-500/5 border border-indigo-500/20 hover:border-indigo-500/40 rounded-xl p-4 font-mono text-sm text-indigo-200 min-h-[160px] whitespace-pre-wrap break-all shadow-inner overflow-y-auto max-h-[250px] transition-colors">
                    {task.result}
                  </div>
                </div>
              ) : task.status === 'failed' ? (
                <div className="flex-1 flex flex-col justify-center items-center text-center p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl min-h-[160px]">
                  <svg className="h-10 w-10 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="mt-3 text-sm font-medium text-rose-400">Processing Failed</span>
                  <p className="mt-1 text-xs text-slate-500 max-w-xs">
                    The background worker encountered errors. Press "Re-Run Task" to try again.
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center items-center text-center p-4 bg-slate-900/40 border border-slate-800 rounded-xl min-h-[160px]">
                  <div className="relative flex items-center justify-center">
                    <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                  <span className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Processing in Stream...
                  </span>
                  <p className="mt-1 text-[11px] text-slate-600">
                    Task is queued in the worker pool.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Timeline Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Worker Execution Timeline & Trace Logs
            </h3>
            <Timeline logs={task.logs} />
          </div>
        </div>
      )}
    </div>
  );
}
