/**
 * @fileoverview GreenOpsPanel component.
 * Displays AI-generated sustainability optimization actions.
 */

import React from 'react';
import { Leaf } from 'lucide-react';

export default function GreenOpsPanel({ optimizations, loading, onGenerateOptimizations }) {
  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col gap-4">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Leaf className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            Green Ops Optimizer
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">AI resource actions from live crowd, transit, and weather data</p>
        </div>
        <button
          type="button"
          onClick={onGenerateOptimizations}
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition shrink-0 cursor-pointer"
        >
          {loading ? 'Optimizing...' : 'Optimize Ops'}
        </button>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 min-h-[236px]">
        {optimizations?.length ? (
          <div className="space-y-3">
            {optimizations.map((item) => (
              <div
                key={`${item.area}-${item.recommendation}`}
                className="border-b border-slate-800 last:border-0 pb-3 last:pb-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold text-white">{item.area}</p>
                  <span className="text-[10px] font-bold text-emerald-300">{item.impact} impact</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mt-1">{item.recommendation}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-center text-slate-500 text-xs py-16">
            Generate specific resource-saving actions for energy, waste, and water operations.
          </div>
        )}
      </div>
    </div>
  );
}
