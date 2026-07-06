import React from 'react';
import { Activity, Flame, AlertTriangle, Bus, ShieldAlert, UserCheck } from 'lucide-react';
import AlertCard from './AlertCard';

export default function StaffCopilotFeed({
  alerts = [],
  language,
  triggerSpike,
  onExplain,
  explainingAlertId,
  alertExplanation,
  loadingExplanation,
  setExplainingAlertId
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[500px]">
      <h2 className="sr-only">Staff Operations & Security Feed</h2>

      {/* Incident Spikes */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 flex flex-col gap-5 shadow-lg">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" aria-hidden="true" />
              Incident Control Panel
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Hackathon Trigger Panel: Simulate live sensor spikes and emergencies to test real-time AI alert
              evaluation.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => triggerSpike('crowd')}
              className="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition text-left cursor-pointer"
            >
              <div>
                <span className="text-xs font-bold block">1. Simulate Crowd Density Spike</span>
                <span className="text-[10px] text-amber-400/80">Spike Gate B capacity to 96% + bottlenecks</span>
              </div>
              <Flame className="w-5 h-5 text-amber-400 animate-pulse" aria-hidden="true" />
            </button>

            <button
              onClick={() => triggerSpike('medical')}
              className="flex items-center justify-between p-3.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 transition text-left cursor-pointer"
            >
              <div>
                <span className="text-xs font-bold block">2. Simulate Medical Incident</span>
                <span className="text-[10px] text-red-400/80">
                  Report collapsed fan at Gate C upper escalators
                </span>
              </div>
              <AlertTriangle className="w-5 h-5 text-red-400" aria-hidden="true" />
            </button>

            <button
              onClick={() => triggerSpike('transit')}
              className="flex items-center justify-between p-3.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition text-left cursor-pointer"
            >
              <div>
                <span className="text-xs font-bold block">3. Simulate Transit Delay</span>
                <span className="text-[10px] text-indigo-400/80">
                  Suspend rail service + Transit Hub gridlock
                </span>
              </div>
              <Bus className="w-5 h-5 text-indigo-400" aria-hidden="true" />
            </button>

            <div className="border-t border-slate-800 my-1"></div>

            <button
              onClick={() => triggerSpike('clear')}
              className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold text-center transition shadow-lg shadow-emerald-600/10 cursor-pointer"
            >
              Reset Simulator (All Normal)
            </button>
          </div>
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div
          className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 flex flex-col gap-4 flex-1 shadow-lg"
          aria-live="polite"
        >
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-400" aria-hidden="true" />
              Live Staff Alerts (LLM-Evaluated)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              AI analyzes raw turnstile counts and sensor alerts to generate response plans with confidence
              scores.
            </p>
          </div>

          {alerts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl min-h-[300px]">
              <UserCheck className="w-12 h-12 text-slate-600 mb-3" aria-hidden="true" />
              <h4 className="text-sm font-semibold text-slate-300">All Operations Stable</h4>
              <p className="text-xs text-slate-500 max-w-[280px] mt-1">
                No active incidents. Use the control panel on the left to trigger emergency alerts.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {alerts.map((alert, idx) => (
                <AlertCard
                  key={idx}
                  alert={alert}
                  language={language}
                  onExplain={onExplain}
                  explainingAlertId={explainingAlertId}
                  alertExplanation={alertExplanation}
                  loadingExplanation={loadingExplanation}
                  setExplainingAlertId={setExplainingAlertId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
