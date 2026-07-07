/**
 * @fileoverview StadiumPulse AI API service layer.
 * Centralizes all HTTP calls to the FastAPI backend.
 * Falls back gracefully if the server is offline.
 */

const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:8000/api';

/**
 * Helper to perform HTTP requests and validate responses.
 *
 * @param {string} url - Target URL.
 * @param {RequestInit} [options] - Fetch configuration parameters.
 * @returns {Promise<any>} Response JSON data.
 */
async function request(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error('Offline');
  return res.json();
}

/**
 * Fetches the current live simulator state (crowd densities, transit, incidents, weather).
 *
 * @returns {Promise<Object>} Stadium state object from the backend simulator.
 * @throws {Error} If the server returns a non-OK response or is unreachable.
 */
export function fetchStatus() {
  return request(`${API_BASE}/status`);
}

/**
 * Fetches the latest Gemini-evaluated safety alerts for the Staff Copilot feed.
 *
 * @returns {Promise<Array<Object>>} Array of structured alert objects with recommended actions.
 * @throws {Error} If the server returns a non-OK response or is unreachable.
 */
export function fetchAlerts() {
  return request(`${API_BASE}/alerts`);
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
export function sendChatMessage(message, history, accessibilityMode, language) {
  return request(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      history,
      accessibility_mode: accessibilityMode,
      language
    })
  });
}

/**
 * Requests a volunteer-friendly plain-language explanation of a staff alert.
 *
 * @param {Object} alert - The structured alert object from the Staff Copilot feed.
 * @param {string} language - Target output language (e.g. 'English', 'Spanish').
 * @returns {Promise<{explanation: string}>} Simplified volunteer instruction text.
 * @throws {Error} If the server returns a non-OK response or is unreachable.
 */
export function explainAlert(alert, language) {
  return request(`${API_BASE}/explain-alert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alert, language })
  });
}

/**
 * Requests an AI-generated operations shift handover briefing.
 * Summarizes the last 4 hours of incidents and crowd data in 3 bullet points.
 *
 * @param {string} language - Target translation language chosen by the user.
 * @returns {Promise<{briefing: string}>} Formatted shift briefing text.
 * @throws {Error} If the server returns a non-OK response or is unreachable.
 */
export function fetchShiftBriefing(language) {
  return request(`${API_BASE}/briefing/shift?language=${encodeURIComponent(language)}`);
}

/**
 * Requests an AI-generated post-match sustainability performance report.
 * Covers waste diversion, solar energy contribution, and water usage.
 *
 * @param {string} language - Target translation language chosen by the user.
 * @returns {Promise<{report: string}>} Narrative sustainability report text.
 * @throws {Error} If the server returns a non-OK response or is unreachable.
 */
export function fetchSustainabilityBriefing(language) {
  return request(`${API_BASE}/briefing/sustainability?language=${encodeURIComponent(language)}`);
}

/**
 * Requests AI-optimized sustainability actions from live crowd, transit, and weather data.
 *
 * @returns {Promise<{optimizations: Array<{area: string, recommendation: string, impact: string}>}>}
 *   Green operations recommendations.
 * @throws {Error} If the server returns a non-OK response or is unreachable.
 */
export function fetchSustainabilityOptimizations() {
  return request(`${API_BASE}/sustainability/optimize`);
}

/**
 * Requests AI transportation guidance based on current departure congestion.
 *
 * @returns {Promise<{recommended_mode: string, reasoning: string, suggested_departure_window: string}>}
 *   Transit recommendation details.
 * @throws {Error} If the server returns a non-OK response or is unreachable.
 */
export function fetchTransportationRecommendation() {
  return request(`${API_BASE}/transportation/recommend`);
}

/**
 * Triggers a simulated incident spike on the backend state machine.
 *
 * @param {'crowd' | 'medical' | 'transit' | 'clear'} spikeType - The type of incident to simulate.
 * @returns {Promise<{message: string, state: Object}>} Confirmation message and updated state.
 * @throws {Error} If the server returns a non-OK response or is unreachable.
 */
export function triggerSpike(spikeType) {
  return request(`${API_BASE}/trigger-spike`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spike_type: spikeType })
  });
}
