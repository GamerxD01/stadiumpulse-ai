import React from 'react';
import ExplainAlertButton from './ExplainAlertButton';

export default function AlertCard({
  alert,
  language,
  onExplain,
  explainingAlertId,
  alertExplanation,
  loadingExplanation,
  setExplainingAlertId
}) {
  const isExplainingThis = explainingAlertId === alert.incident_id;

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3 shadow-md">
      <div className="flex justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                alert.severity === 'Critical'
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse'
                  : alert.severity === 'High'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
              }`}
            >
              {alert.severity} Severity
            </span>
            <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 font-semibold px-2 py-0.5 rounded">
              Area: {alert.crowd_density} Density
            </span>
          </div>
          <h4 className="text-sm font-bold text-white mt-1.5">{alert.title}</h4>
        </div>

        <div className="flex flex-col items-center bg-indigo-950/60 border border-indigo-900 rounded-xl px-3 py-1.5 text-center">
          <span className="text-xs font-bold text-indigo-400">{alert.confidence_score}%</span>
          <span className="text-[9px] text-indigo-300/80 font-medium">Confidence</span>
        </div>
      </div>

      <div>
        <span className="text-[11px] font-bold text-slate-400 block mb-1">
          Recommended Response Plan:
        </span>
        <ul className="space-y-1.5">
          {alert.recommended_actions.map((act, i) => (
            <li key={i} className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed">
              <span className="text-indigo-500 font-bold mt-0.5">•</span>
              <span>{act}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-slate-900 pt-3 flex justify-between items-center gap-4">
        <p className="text-[10px] text-slate-500 italic max-w-[70%]">
          <strong>Reasoning:</strong> {alert.rationale}
        </p>
        <button
          onClick={() => onExplain(alert, language)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer"
        >
          Explain Alert
        </button>
      </div>

      {/* Explain Modal Drawer Inline */}
      {isExplainingThis && (
        <ExplainAlertButton
          alert={alert}
          language={language}
          onExplain={onExplain}
          isExplaining={loadingExplanation}
          explanation={alertExplanation}
          onDismiss={() => setExplainingAlertId(null)}
        />
      )}
    </div>
  );
}
