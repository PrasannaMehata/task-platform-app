import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTasks = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const params = { page, limit };
      if (statusFilter) {
        params.status = statusFilter;
      }
      const response = await api.get('/api/tasks', { params });
      if (response.data && response.data.success) {
        setTasks(response.data.tasks);
        setTotal(response.data.total);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tasks.');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [page, limit, statusFilter]);

  // Initial load and filter/page changes
  useEffect(() => {
    fetchTasks(true);
  }, [fetchTasks]);

  // Auto-refresh list every 10 seconds for live updates
  useEffect(() => {
    const timer = setInterval(() => {
      fetchTasks(false);
    }, 10000);

    return () => clearInterval(timer);
  }, [fetchTasks]);

  const handleFilterChange = (status) => {
    setStatusFilter(status);
    setPage(1); // Reset to first page
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const truncate = (text, maxLength = 35) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Tasks Dashboard
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Monitor and manage your string processing jobs.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <button
            onClick={() => fetchTasks(true)}
            className="inline-flex items-center px-4 py-2 border border-slate-700 rounded-xl text-sm font-medium text-slate-300 bg-slate-800/40 hover:bg-slate-800/80 transition-all cursor-pointer"
          >
            Refresh
          </button>
          <Link
            to="/tasks/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-all transform hover:scale-[1.02] cursor-pointer"
          >
            + Create New Task
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-slate-800 pb-px mb-6">
        <nav className="flex space-x-2 overflow-x-auto pb-3" aria-label="Tabs">
          {[
            { value: '', label: 'All Tasks' },
            { value: 'pending', label: 'Pending' },
            { value: 'running', label: 'Running' },
            { value: 'success', label: 'Success' },
            { value: 'failed', label: 'Failed' },
          ].map((tab) => {
            const isActive = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => handleFilterChange(tab.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {error && (
        <div className="mb-6 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl p-4">
          {error}
        </div>
      )}

      {/* Task List */}
      <div className="backdrop-blur-md bg-slate-800/20 border border-slate-800/60 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <svg className="animate-spin h-10 w-10 text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="mt-4 text-slate-400 text-sm">Loading tasks...</span>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16 px-4">
            <svg className="mx-auto h-12 w-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-slate-200">No tasks found</h3>
            <p className="mt-2 text-sm text-slate-400 max-w-sm mx-auto">
              {statusFilter
                ? `You don't have any tasks in the '${statusFilter}' status.`
                : "Get started by creating your first string processing task."}
            </p>
            {!statusFilter && (
              <div className="mt-6">
                <Link
                  to="/tasks/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-all cursor-pointer"
                >
                  Create Task
                </Link>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800/80">
                <thead className="bg-slate-900/40">
                  <tr>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Title
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Operation
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Input Text
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Output Result
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Created At
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="relative px-6 py-3.5">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 bg-slate-900/10">
                  {tasks.map((task) => (
                    <tr key={task._id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-200">
                        {task.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {getOperationLabel(task.operationType)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 max-w-xs truncate">
                        {truncate(task.inputText)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 font-mono max-w-xs truncate">
                        {task.status === 'success' ? truncate(task.result) : <span className="text-slate-600">-</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {new Date(task.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={task.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          to={`/tasks/${task._id}`}
                          className="text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          View Logs →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-slate-900/30 border-t border-slate-850 px-6 py-4 flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  className="relative inline-flex items-center px-4 py-2 border border-slate-700 text-sm font-medium rounded-xl text-slate-300 bg-slate-800/40 hover:bg-slate-800/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Previous
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-700 text-sm font-medium rounded-xl text-slate-300 bg-slate-800/40 hover:bg-slate-800/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-400">
                    Showing <span className="font-semibold text-slate-300">{(page - 1) * limit + 1}</span> to{' '}
                    <span className="font-semibold text-slate-300">
                      {Math.min(page * limit, total)}
                    </span>{' '}
                    of <span className="font-semibold text-slate-300">{total}</span> tasks
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex space-x-1" aria-label="Pagination">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(1)}
                      className="relative inline-flex items-center px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/40 text-sm font-medium text-slate-400 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      « First
                    </button>
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(p => Math.max(p - 1, 1))}
                      className="relative inline-flex items-center px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/40 text-sm font-medium text-slate-400 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      ‹ Prev
                    </button>
                    <span className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800/20 border border-slate-800 rounded-xl">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                      className="relative inline-flex items-center px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/40 text-sm font-medium text-slate-400 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      Next ›
                    </button>
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage(totalPages)}
                      className="relative inline-flex items-center px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/40 text-sm font-medium text-slate-400 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      Last »
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
