import React from 'react';
import { Activity } from 'lucide-react';

/**
 * ChatMessage — Renders a single conversation bubble in the Fan Companion chat feed.
 *
 * Displays user messages right-aligned in indigo and AI model responses left-aligned
 * in slate. When the model response includes tool call metadata, renders compact
 * tool badge chips below the message text showing which orchestrator functions fired.
 *
 * @param {{ role: string, text: string, tools?: Array<{name: string, args: Object}> }} msg
 *   The message object to render. `role` is either "user" or "model".
 */
export default function ChatMessage({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
          isUser
            ? 'bg-indigo-600 text-white rounded-br-none shadow-md'
            : 'bg-slate-900/90 text-slate-100 border border-slate-800/80 rounded-bl-none shadow-md'
        }`}
      >
        <p className="whitespace-pre-line">{msg.text}</p>

        {msg.tools && msg.tools.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex flex-wrap gap-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <Activity className="w-3 h-3 text-indigo-400" aria-hidden="true" /> Orchestrator executed:
            </span>
            {msg.tools.map((tool, idx) => (
              <span
                key={`${tool.name}-${idx}`}
                className="bg-indigo-950/80 text-indigo-300 border border-indigo-800 text-[10px] px-2 py-0.5 rounded font-mono"
              >
                {tool.name}({Object.keys(tool.args).join(', ')})
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
