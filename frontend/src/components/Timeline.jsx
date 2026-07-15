import React from 'react';

export default function Timeline({ logs }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="text-slate-500 text-sm italic p-4 text-center border border-dashed border-slate-800 rounded-lg">
        No logs recorded yet.
      </div>
    );
  }

  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + 
        '.' + String(date.getMilliseconds()).padStart(3, '0');
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-6 font-mono text-sm leading-relaxed max-w-full overflow-x-auto shadow-inner">
      <div className="flex items-center space-x-2 border-b border-slate-900 pb-3 mb-4">
        <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
        <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
        <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
        <span className="text-slate-500 text-xs pl-2">execution_log.txt</span>
      </div>
      <div className="space-y-2.5">
        {logs.map((log, index) => (
          <div key={index} className="flex items-start space-x-3 text-slate-300 hover:bg-slate-900/40 p-1.5 rounded transition-all">
            <span className="text-slate-600 select-none text-xs pt-0.5">
              [{formatTime(log.timestamp)}]
            </span>
            <span className="flex-1 text-slate-300 whitespace-pre-wrap break-all">
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
