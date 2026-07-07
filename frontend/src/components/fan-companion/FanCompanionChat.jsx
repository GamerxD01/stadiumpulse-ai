import React, { useRef, useEffect } from 'react';
import { Accessibility, Languages, Bus, MessageSquare, RefreshCw } from 'lucide-react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

// ---------------------------------------------------------------------------
// Module-level constants — defined outside the component so they are never
// recreated on re-renders. Suggestion pills are static data, not component state.
// ---------------------------------------------------------------------------

/**
 * Static suggestion pills shown below the chat input.
 * Each entry has a short human-readable `label` and the full query `value`
 * that is sent to the orchestrator when the pill is clicked.
 *
 * @type {Array<{label: string, value: string}>}
 */
const SUGGESTION_PILLS = [
  {
    label: 'Wheelchair Route Section 102',
    value: 'How do I get to Section 102 from Gate A? I need elevator/step-free access.'
  },
  { label: 'Is Gate B turnstile busy?', value: 'What is the current crowd density at Gate B?' },
  { label: 'Next train back to Manhattan', value: 'What is the wait time and status for the Train right now?' },
  {
    label: '¿Cómo llegar a la salida? (ES)',
    value: '¿Cómo llegar a la salida principal desde el Seating Bowl en un camino sin escaleras?'
  }
];

/** Message used to reset chat history to a clean slate. */
const CLEAR_HISTORY_MESSAGE = { role: 'model', text: 'Chat history cleared. How can I help you today?' };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * FanCompanionChat — Main panel for the Fan Companion tab.
 *
 * Renders the accessibility toggle, language selector, live transit congestion
 * sidebar, and the multi-turn AI chat box. All state is lifted to the parent
 * via callback props — this component is purely presentational.
 *
 * @param {string}   language           - Currently selected output language.
 * @param {Function} setLanguage        - Setter to change the selected language.
 * @param {boolean}  accessibilityMode  - Whether step-free routing is active.
 * @param {Function} setAccessibilityMode - Setter to toggle accessibility mode.
 * @param {Object}   stadiumState       - Live stadium state for the transit widget.
 * @param {Array}    messages           - Ordered array of {role, text, tools?} messages.
 * @param {Function} setMessages        - Setter to override the message list (used for clear).
 * @param {string}   chatInput          - Current controlled input value.
 * @param {Function} setChatInput       - Setter for the controlled input value.
 * @param {boolean}  sendingChat        - True while an AI response is in-flight.
 * @param {Function} handleSendMessage  - Callback to dispatch the current input as a message.
 */
export default function FanCompanionChat({
  language,
  setLanguage,
  accessibilityMode,
  setAccessibilityMode,
  stadiumState,
  messages,
  setMessages,
  chatInput,
  setChatInput,
  sendingChat,
  handleSendMessage
}) {
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-[500px]">
      <h2 className="sr-only">Fan Companion Workspace</h2>

      {/* Left sidebar FAQ & settings */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        {/* Accessibility Card */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Accessibility className="w-4 h-4 text-indigo-400" aria-hidden="true" />
            Accessibility Settings
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Enable accessibility mode to automatically route around stairwells and receive step-free navigation.
          </p>
          <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-xs font-semibold text-slate-300">Step-free Ramps / Elevators Only</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={accessibilityMode}
                onChange={() => setAccessibilityMode(!accessibilityMode)}
                aria-label="Toggle step-free accessible routes only"
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        {/* Language Selection Card */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Languages className="w-4 h-4 text-indigo-400" aria-hidden="true" />
            Select Chat Language
          </h3>
          <p className="text-xs text-slate-400">
            The orchestrator detects language natively. Setting this enforces translation overlays.
          </p>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label="Select chat language"
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500 transition duration-150 cursor-pointer"
          >
            <option value="English">English</option>
            <option value="Spanish">Español (Spanish)</option>
            <option value="Portuguese">Português (Portuguese)</option>
            <option value="Arabic">العربية (Arabic)</option>
            <option value="Hindi">हिन्दी (Hindi)</option>
            <option value="French">Français (French)</option>
            <option value="Japanese">日本語 (Japanese)</option>
            <option value="German">Deutsch (German)</option>
            <option value="Korean">한국어 (Korean)</option>
            <option value="Mandarin Chinese">普通话 (Mandarin)</option>
            <option value="Italian">Italiano (Italian)</option>
            <option value="Dutch">Nederlands (Dutch)</option>
            <option value="Russian">Русский (Russian)</option>
            <option value="Turkish">Türkçe (Turkish)</option>
            <option value="Swahili">Kiswahili (Swahili)</option>
          </select>
        </div>

        {/* Live Congestion */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">MetLife Live Congestion</h3>
          {stadiumState ? (
            <div className="flex flex-col gap-2">
              {Object.entries(stadiumState.transit_status).map(([mode, info]) => (
                <div
                  key={mode}
                  className="flex justify-between items-center text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800/60"
                >
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Bus className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" /> {mode}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        info.congestion === 'Low'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : info.congestion === 'Medium'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse'
                      }`}
                    >
                      {info.congestion}
                    </span>
                    <span className="text-slate-400 font-medium">{info.wait_time_mins}m wait</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Connecting to simulator state...</p>
          )}
        </div>
      </div>

      {/* Chat Box Panel */}
      <div className="lg:col-span-3 bg-slate-900/40 border border-slate-800 rounded-3xl p-5 flex flex-col gap-4 overflow-hidden h-[600px] shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600/10 p-2 rounded-xl text-indigo-400 border border-indigo-500/20">
              <MessageSquare className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">StadiumPulse Fan Companion</h3>
              <p className="text-xs text-slate-400">Ask wayfinding, transit schedules, and general stadium FAQs</p>
            </div>
          </div>
          <button
            onClick={() => setMessages([CLEAR_HISTORY_MESSAGE])}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
            title="Clear history"
            aria-label="Clear chat history"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Chat Message Scroll */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          {messages.map((msg, i) => (
            // Index key is acceptable here: messages are append-only and never reordered
            <ChatMessage key={i} msg={msg} />
          ))}
          {sendingChat && (
            <div className="flex justify-start">
              <div className="bg-slate-900/90 text-slate-300 border border-slate-800 rounded-2xl rounded-bl-none p-4 text-sm flex items-center gap-2 shadow-md">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce"></span>
                  <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce delay-100"></span>
                  <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce delay-200"></span>
                </div>
                <span>Orchestrator thinking...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Suggestions */}
        <div className="flex flex-wrap gap-2 pt-2">
          {SUGGESTION_PILLS.map((pill) => (
            <button
              key={pill.label}
              onClick={() => {
                setChatInput(pill.value);
                handleSendMessage(pill.value);
              }}
              className="bg-slate-950 hover:bg-slate-900 text-slate-300 border border-slate-800 text-[11px] px-3 py-1.5 rounded-full transition font-medium"
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Input Box */}
        <ChatInput
          chatInput={chatInput}
          setChatInput={setChatInput}
          sendingChat={sendingChat}
          onSubmit={handleSendMessage}
        />
      </div>
    </div>
  );
}
