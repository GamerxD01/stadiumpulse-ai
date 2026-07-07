/**
 * @fileoverview DecisionBriefPanel component.
 * Renders a unified World Cup 2026 operations brief across every challenge area.
 */

import React from 'react';
import { BrainCircuit } from 'lucide-react';

const BRIEF_FIELDS = [
  ['navigation', 'Navigation'],
  ['crowd_management', 'Crowd'],
  ['accessibility', 'Accessibility'],
  ['transportation', 'Transportation'],
  ['sustainability', 'Sustainability'],
  ['multilingual_assistance', 'Multilingual'],
  ['operational_intelligence', 'Ops Intel'],
  ['real_time_decision_support', 'Decision']
];

export default function DecisionBriefPanel({ decisionBrief, loading, onGenerateDecisionBrief }) {
  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col gap-4">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <BrainCircuit className="w-4 h-4 text-fuchsia-400" aria-hidden="true" />
            World Cup 2026 Decision Brief
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">One GenAI command brief across all stadium operations areas</p>
        </div>
        <button
          type="button"
          onClick={onGenerateDecisionBrief}
          disabled={loading}
          className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition shrink-0 cursor-pointer"
        >
          {loading ? 'Synthesizing...' : 'Generate Brief'}
        </button>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 min-h-[250px]">
        {decisionBrief ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-white">Priority Level</span>
              <span className="text-xs font-bold text-fuchsia-300">{decisionBrief.priority_level}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {BRIEF_FIELDS.map(([key, label]) => (
                <div key={key} className="border border-slate-800 rounded-xl p-3">
                  <p className="text-[11px] font-bold text-slate-400 uppercase">{label}</p>
                  <p className="text-xs text-slate-200 leading-relaxed mt-1">{decisionBrief[key]}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-center text-slate-500 text-xs py-20">
            Generate a unified GenAI action brief for fans, organizers, volunteers, and venue staff.
          </div>
        )}
      </div>
    </div>
  );
}
