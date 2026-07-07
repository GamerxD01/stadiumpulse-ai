/**
 * @fileoverview OrganizerDashboard component.
 * Displays real-time metrics, live crowd density charts, GenAI operations briefs, and sustainability post-match metrics.
 */

import React from 'react';
import { Bus, Leaf } from 'lucide-react';
import DensityChart from './DensityChart';
import ShiftBriefingPanel from './ShiftBriefingPanel';
import SustainabilityPanel from './SustainabilityPanel';

export default function OrganizerDashboard({
  stadiumState,
  shiftBriefing,
  loadingShift,
  onGenerateShiftBriefing,
  sustainabilityReport,
  loadingSustainability,
  onGenerateSustainabilityBriefing,
  sustainabilityOptimizations,
  loadingOptimizations,
  onGenerateSustainabilityOptimizations,
  transportationRecommendation,
  loadingTransportation,
  onGenerateTransportationRecommendation
}) {
  const transitEntries = Object.entries(stadiumState.transit_status || {});

  return (
    <div className="flex flex-col gap-6">
      <h2 className="sr-only">Organizer Dashboard & Command Controls</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Density Bar Chart */}
        <DensityChart stadiumState={stadiumState} />

        {/* Sustainability Resource Metrics Panel */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col justify-between gap-4">
          <h3 className="text-sm font-bold text-white">Sustainability & Resource Efficiency</h3>

          <div className="space-y-3.5">
            <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">Waste Diverted (Recycling)</span>
              <span className="text-sm font-bold text-emerald-400">82.4%</span>
            </div>
            <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">Solar energy used today</span>
              <span className="text-sm font-bold text-indigo-400">8,400 kWh</span>
            </div>
            <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">Rainwater harvest total</span>
              <span className="text-sm font-bold text-indigo-400">14,200 gal</span>
            </div>
            <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">Operations Score</span>
              <span className="text-sm font-bold text-indigo-400">Grade A-</span>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 italic">Metrics updated live from MetLife IoT sensors.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              onClick={onGenerateTransportationRecommendation}
              disabled={loadingTransportation}
              className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition shrink-0 cursor-pointer"
            >
              {loadingTransportation ? 'Analyzing...' : 'Recommend Route'}
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
            {transportationRecommendation ? (
              <div className="text-xs text-slate-300 leading-relaxed">
                <p className="font-bold text-white mb-1">
                  Recommended mode: {transportationRecommendation.recommended_mode}
                </p>
                <p>{transportationRecommendation.reasoning}</p>
                <p className="text-sky-300 mt-2">{transportationRecommendation.suggested_departure_window}</p>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center text-slate-500 text-xs py-8">
                Generate a live departure recommendation from current transit waits.
              </div>
            )}
          </div>
        </div>

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
              onClick={onGenerateSustainabilityOptimizations}
              disabled={loadingOptimizations}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition shrink-0 cursor-pointer"
            >
              {loadingOptimizations ? 'Optimizing...' : 'Optimize Ops'}
            </button>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 min-h-[236px]">
            {sustainabilityOptimizations?.length ? (
              <div className="space-y-3">
                {sustainabilityOptimizations.map((item) => (
                  <div key={`${item.area}-${item.recommendation}`} className="border-b border-slate-800 last:border-0 pb-3 last:pb-0">
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
      </div>

      {/* GenAI Report Drafts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ShiftBriefingPanel
          shiftBriefing={shiftBriefing}
          loadingShift={loadingShift}
          onGenerateShiftBriefing={onGenerateShiftBriefing}
        />
        <SustainabilityPanel
          sustainabilityReport={sustainabilityReport}
          loadingSustainability={loadingSustainability}
          onGenerateSustainabilityBriefing={onGenerateSustainabilityBriefing}
        />
      </div>
    </div>
  );
}
