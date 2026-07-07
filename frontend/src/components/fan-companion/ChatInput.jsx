import React from 'react';
import { Send } from 'lucide-react';

/**
 * ChatInput — Controlled text input and submit button for the Fan Companion chat.
 *
 * Supports keyboard submission via the Enter key and disables both the input field
 * and the send button while a chat response is in-flight to prevent duplicate sends.
 *
 * @param {string}   chatInput    - The current controlled input value.
 * @param {Function} setChatInput - Setter to update the input value on change.
 * @param {boolean}  sendingChat  - When true, input and button are disabled.
 * @param {Function} onSubmit     - Callback invoked when the user presses Enter or clicks Send.
 */
export default function ChatInput({ chatInput, setChatInput, sendingChat, onSubmit }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSubmit();
    }
  };

  return (
    <div className="flex items-center gap-2 border-t border-slate-800 pt-3">
      <input
        type="text"
        value={chatInput}
        onChange={(e) => setChatInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask StadiumPulse AI..."
        aria-label="Chat query input"
        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 outline-none focus:border-indigo-600 transition"
        disabled={sendingChat}
      />
      <button
        onClick={() => onSubmit()}
        disabled={sendingChat}
        aria-label="Send Message"
        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-3.5 rounded-xl transition flex items-center justify-center shadow-lg shadow-indigo-500/10"
      >
        <Send className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}
