import React from 'react';
import { HelpCircle } from 'lucide-react';
import LoadingSpinner from '../shared/LoadingSpinner';

export default function ExplainAlertButton({
  alert,
  language,
  onExplain,
  isExplaining,
  explanation,
  onDismiss
}) {
  return (
    <div className="mt-4 pt-3.5 border-t border-slate-800 flex flex-col gap-2 relative">
      <button
        onClick={() => onExplain(alert, language)}
        className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 transition font-semibold"
      >
        <HelpCircle className="w-4 h-4 text-indigo-400" aria-hidden="true" />
        GenAI Jargon-Free Guide (New Volunteer Mode)
      </button>

      {isExplaining && (
        <div className="mt-2.5 bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 relative flex flex-col gap-1.5 animate-fadeIn">
          <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
            GenAI Jargon-Free Guide (New Volunteer Mode)
          </h5>
          <LoadingSpinner text={`Drafting plain-text guidance in ${language}...`} />
          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 text-[10px] text-slate-500 hover:text-slate-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {explanation && !isExplaining && (
        <div className="mt-2.5 bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 relative flex flex-col gap-1.5 animate-fadeIn">
          <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
            GenAI Jargon-Free Guide (New Volunteer Mode)
          </h5>
          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
            {explanation}
          </p>
          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 text-[10px] text-slate-500 hover:text-slate-300"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
