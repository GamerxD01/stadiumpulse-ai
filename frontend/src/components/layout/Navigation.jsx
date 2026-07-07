import React from 'react';
import { Compass, ShieldAlert, BarChart3 } from 'lucide-react';

export default function Navigation({ activeTab, setActiveTab, alertsCount = 0 }) {
  return (
    <nav
      className="flex bg-slate-950 p-1 border border-slate-800 rounded-xl"
      aria-label="Main Navigation"
      role="tablist"
    >
      <button
        role="tab"
        aria-selected={activeTab === 'fan'}
        aria-controls="main-content"
        id="tab-fan"
        onClick={() => setActiveTab('fan')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
          activeTab === 'fan'
            ? 'bg-indigo-600 text-white shadow-md'
            : 'text-slate-400 hover:text-white hover:bg-slate-900'
        }`}
      >
        <Compass className="w-4 h-4" aria-hidden="true" />
        Fan Companion
      </button>
      <button
        role="tab"
        aria-selected={activeTab === 'staff'}
        aria-controls="main-content"
        id="tab-staff"
        onClick={() => setActiveTab('staff')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
          activeTab === 'staff'
            ? 'bg-indigo-600 text-white shadow-md'
            : 'text-slate-400 hover:text-white hover:bg-slate-900'
        }`}
      >
        <ShieldAlert className="w-4 h-4" aria-hidden="true" />
        Staff Copilot Alert
        {alertsCount > 0 && (
          <span className="bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
            {alertsCount}
          </span>
        )}
      </button>
      <button
        role="tab"
        aria-selected={activeTab === 'organizer'}
        aria-controls="main-content"
        id="tab-organizer"
        onClick={() => setActiveTab('organizer')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
          activeTab === 'organizer'
            ? 'bg-indigo-600 text-white shadow-md'
            : 'text-slate-400 hover:text-white hover:bg-slate-900'
        }`}
      >
        <BarChart3 className="w-4 h-4" aria-hidden="true" />
        Organizer Panel
      </button>
    </nav>
  );
}
