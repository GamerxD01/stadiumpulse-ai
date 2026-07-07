/**
 * @fileoverview StadiumPulse AI API service layer.
 * Centralizes all HTTP calls to the FastAPI backend.
 * Falls back gracefully if the server is offline.
 */

const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:8000/api';

/**
 * Fetches the current live simulator state (crowd densities, transit, incidents, weather).
 *
 * @returns {Promise<Object>} Stadium state object from the backend simulator.
 * @throws {Error} If the server returns a non-OK response or is unreachable.
 */
export async function fetchStatus() {
  const res = await fetch(`${API_BASE}/status`);
  if (!res.ok) throw new Error('Offline');
  return res.json();
}

/**
 * Fetches the latest Gemini-evaluated safety alerts for the Staff Copilot feed.
 *
 * @returns {Promise<Array<Object>>} Array of structured alert objects with recommended actions.
 * @throws {Error} If the server returns a non-OK response or is unreachable.
 */
export async function fetchAlerts() {
  const res = await fetch(`${API_BASE}/alerts`);
  if (!res.ok) throw new Error('Offline');
  return res.json();
}

/**
 * Sends a fan chat message to the Gemini orchestrator and returns the AI response.
 *
 * @param {string} message - The fan's natural language query (any supported language).
 * @param {Array<{role: string, text: string}>} history - Conversation history for context.
 * @param {boolean} accessibilityMode - When true, forces step-free navigation instructions.
 * @returns {Promise<{response: string, tools_called: Array<Object>}>} AI reply and tool trace.
 * @throws {Error} If the server returns a non-OK response or is unreachable.
 */
export async function sendChatMessage(message, history, accessibilityMode, language) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      history,
      accessibility_mode: accessibilityMode,
      language
    })
  });
  if (!res.ok) throw new Error('Offline');
  return res.json();
}

/**
 * Requests a volunteer-friendly plain-language explanation of a staff alert.
 *
 * @param {Object} alert - The structured alert object from the Staff Copilot feed.
 * @param {string} language - Target output language (e.g. 'English', 'Spanish').
 * @returns {Promise<{explanation: string}>} Simplified volunteer instruction text.
 * @throws {Error} If the server returns a non-OK response or is unreachable.
 */
export async function explainAlert(alert, language) {
  const res = await fetch(`${API_BASE}/explain-alert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alert, language })
  });
  if (!res.ok) throw new Error('Offline');
  return res.json();
}

/**
 * Requests an AI-generated operations shift handover briefing.
 * Summarizes the last 4 hours of incidents and crowd data in 3 bullet points.
 *
 * @param {string} language - Target translation language chosen by the user.
 * @returns {Promise<{briefing: string}>} Formatted shift briefing text.
 * @throws {Error} If the server returns a non-OK response or is unreachable.
 */
export async function fetchShiftBriefing(language) {
  const res = await fetch(`${API_BASE}/briefing/shift?language=${encodeURIComponent(language)}`);
  if (!res.ok) throw new Error('Offline');
  return res.json();
}

/**
 * Requests an AI-generated post-match sustainability performance report.
 * Covers waste diversion, solar energy contribution, and water usage.
 *
 * @param {string} language - Target translation language chosen by the user.
 * @returns {Promise<{report: string}>} Narrative sustainability report text.
 * @throws {Error} If the server returns a non-OK response or is unreachable.
 */
export async function fetchSustainabilityBriefing(language) {
  const res = await fetch(`${API_BASE}/briefing/sustainability?language=${encodeURIComponent(language)}`);
  if (!res.ok) throw new Error('Offline');
  return res.json();
}

/**
 * Triggers a simulated incident spike on the backend state machine.
 *
 * @param {'crowd' | 'medical' | 'transit' | 'clear'} spikeType - The type of incident to simulate.
 * @returns {Promise<{message: string, state: Object}>} Confirmation message and updated state.
 * @throws {Error} If the server returns a non-OK response or is unreachable.
 */
export async function triggerSpike(spikeType) {
  const res = await fetch(`${API_BASE}/trigger-spike`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spike_type: spikeType })
  });
  if (!res.ok) throw new Error('Offline');
  return res.json();
}
