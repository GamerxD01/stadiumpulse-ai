/**
 * @fileoverview TransportationPanel component.
 * Shows live transit wait times and triggers AI departure recommendations.
 */

import React from 'react';
import { Bus } from 'lucide-react';

export default function TransportationPanel({
  transitStatus,
  recommendation,
  loading,
  onGenerateRecommendation
}) {
  const transitEntries = Object.entries(transitStatus || {});

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col gap-4">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Bus className="w-4 h-4 text-sky-400" aria-hidden="true" />
            Transportation Intelligence
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Live departure waits with AI mode and timing guidance</p>
        </div>
        <button
          type="button"
          onClick={onGenerateRecommendation}
          disabled={loading}
          className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition shrink-0 cursor-pointer"
        >
          {loading ? 'Analyzing...' : 'Recommend Route'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {transitEntries.map(([mode, info]) => (
          <div key={mode} className="bg-slate-950 border border-slate-800 rounded-2xl p-3">
            <p className="text-xs font-semibold text-white">{mode}</p>
            <p className="text-[11px] text-slate-400 mt-1">{info.congestion} congestion</p>
            <p className="text-lg font-bold text-sky-300 mt-2">{info.wait_time_mins} min</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 min-h-[118px]">
        {recommendation ? (
          <div className="text-xs text-slate-300 leading-relaxed">
            <p className="font-bold text-white mb-1">Recommended mode: {recommendation.recommended_mode}</p>
            <p>{recommendation.reasoning}</p>
            <p className="text-sky-300 mt-2">{recommendation.suggested_departure_window}</p>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-center text-slate-500 text-xs py-8">
            Generate a live departure recommendation from current transit waits.
          </div>
        )}
      </div>
    </div>
  );
}
