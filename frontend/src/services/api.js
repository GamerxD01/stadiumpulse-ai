const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:8000/api';

/**
 * Calls backend API to fetch current simulator status.
 */
export async function fetchStatus() {
  const res = await fetch(`${API_BASE}/status`);
  if (!res.ok) throw new Error('Offline');
  return res.json();
}

/**
 * Calls backend API to fetch evaluated safety alerts.
 */
export async function fetchAlerts() {
  const res = await fetch(`${API_BASE}/alerts`);
  if (!res.ok) throw new Error('Offline');
  return res.json();
}

/**
 * Calls backend API to post a chat query.
 */
export async function sendChatMessage(message, history, accessibilityMode) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      history,
      accessibility_mode: accessibilityMode
    })
  });
  if (!res.ok) throw new Error('Offline');
  return res.json();
}

/**
 * Calls backend API to explain a safety alert.
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
 * Calls backend API to fetch generated shift briefing.
 */
export async function fetchShiftBriefing() {
  const res = await fetch(`${API_BASE}/briefing/shift`);
  if (!res.ok) throw new Error('Offline');
  return res.json();
}

/**
 * Calls backend API to fetch generated sustainability briefing.
 */
export async function fetchSustainabilityBriefing() {
  const res = await fetch(`${API_BASE}/briefing/sustainability`);
  if (!res.ok) throw new Error('Offline');
  return res.json();
}

/**
 * Calls backend API to trigger a sensor spike simulation.
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
