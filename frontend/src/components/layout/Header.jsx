import React from 'react';
import { Thermometer } from 'lucide-react';

export default function Header({ alerts = [], stadiumState, children }) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
      <div className="flex items-center gap-3">
        <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20 text-white flex items-center justify-center font-bold text-lg">
          SP
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            StadiumPulse AI
            <span className="bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs px-2.5 py-0.5 rounded-full font-medium">
              FIFA 2026 Layer
            </span>
          </h1>
          <p className="text-xs text-slate-400">MetLife Stadium Operations & Assistant Hub</p>
        </div>
      </div>

      {/* Global Stats Tag */}
      <div className="flex items-center gap-3 bg-slate-950/60 px-4 py-2 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2.5 h-2.5 rounded-full ${alerts.length > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}
          ></div>
          <span className="text-xs font-semibold text-slate-300">
            {alerts.length > 0 ? `${alerts.length} Active Incidents` : 'Stadium Status Normal'}
          </span>
        </div>
        {stadiumState && (
          <div className="text-xs text-slate-400 border-l border-slate-800 pl-3 flex items-center gap-1">
            <Thermometer className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
            <span>
              {stadiumState.weather.temp}°C {stadiumState.weather.condition}
            </span>
          </div>
        )}
      </div>

      {children}
    </header>
  );
}
