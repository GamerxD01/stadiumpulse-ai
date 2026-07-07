import React from 'react';
import { UserCheck } from 'lucide-react';

export default function ShiftBriefingPanel({ shiftBriefing, loadingShift, onGenerateShiftBriefing }) {
  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col gap-4">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-indigo-400" aria-hidden="true" />
            Operations Shift Briefing
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">GenAI summarizes recent incident logs and operations updates</p>
        </div>
        <button
          onClick={onGenerateShiftBriefing}
          disabled={loadingShift}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition shrink-0 cursor-pointer"
        >
          {loadingShift ? 'Compiling...' : 'Generate Shift Briefing'}
        </button>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex-1 min-h-[150px]">
        {shiftBriefing ? (
          <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{shiftBriefing}</div>
        ) : (
          <div className="h-full flex items-center justify-center text-center text-slate-500 text-xs py-10">
            Click the button above to auto-generate shift briefing.
          </div>
        )}
      </div>
    </div>
  );
}
