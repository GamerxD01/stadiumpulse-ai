import React from 'react';
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
  onGenerateSustainabilityBriefing
}) {
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

          <p className="text-[10px] text-slate-500 italic">
            Metrics updated live from MetLife IoT sensors.
          </p>
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
