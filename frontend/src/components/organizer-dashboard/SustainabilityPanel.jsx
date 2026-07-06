import React from 'react';
import { Zap } from 'lucide-react';

export default function SustainabilityPanel({
  sustainabilityReport,
  loadingSustainability,
  onGenerateSustainabilityBriefing
}) {
  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col gap-4">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            Sustainability Narrative Summary
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Drafts post-match reporting comments from waste and power meters
          </p>
        </div>
        <button
          onClick={onGenerateSustainabilityBriefing}
          disabled={loadingSustainability}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition shrink-0 cursor-pointer"
        >
          {loadingSustainability ? 'Drafting...' : 'Generate Narrative'}
        </button>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex-1 min-h-[150px]">
        {sustainabilityReport ? (
          <div className="text-xs text-slate-300 leading-relaxed">{sustainabilityReport}</div>
        ) : (
          <div className="h-full flex items-center justify-center text-center text-slate-500 text-xs py-10">
            Click the button above to draft the narrative post-match report.
          </div>
        )}
      </div>
    </div>
  );
}
