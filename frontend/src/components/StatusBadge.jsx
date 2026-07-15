import React from 'react';

export default function StatusBadge({ status }) {
  let styles = '';
  let label = '';
  let dotAnimation = '';

  switch (status) {
    case 'pending':
      styles = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      label = 'Pending';
      dotAnimation = 'bg-amber-400';
      break;
    case 'running':
      styles = 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      label = 'Running';
      dotAnimation = 'bg-blue-400 animate-ping';
      break;
    case 'success':
      styles = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      label = 'Success';
      dotAnimation = 'bg-emerald-400';
      break;
    case 'failed':
      styles = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      label = 'Failed';
      dotAnimation = 'bg-rose-500';
      break;
    default:
      styles = 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
      label = status;
      dotAnimation = 'bg-slate-400';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${styles}`}>
      <span className="relative flex h-2 w-2 mr-1.5">
        {status === 'running' && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${dotAnimation}`}></span>
      </span>
      {label}
    </span>
  );
}
