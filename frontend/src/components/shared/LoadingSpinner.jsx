import React from 'react';

export default function LoadingSpinner({ text }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-400 animate-pulse font-medium">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce"></span>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce delay-100"></span>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce delay-200"></span>
      </div>
      <span>{text}</span>
    </div>
  );
}
