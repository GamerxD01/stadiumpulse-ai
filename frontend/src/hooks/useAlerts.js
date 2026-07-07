/**
 * @fileoverview useAlerts — React hook that manages Staff Copilot safety alert polling.
 *
 * Polls the FastAPI backend for AI-evaluated incident alerts every 4 seconds.
 * Falls back to locally-computed mock alerts when the server is unreachable.
 * Also provides the explainIncidentAlert action which fetches volunteer-friendly
 * explanations for individual alerts in the selected language.
 */

import { useState, useEffect } from 'react';
import * as api from '../services/api';

/** Polling interval (ms) between backend alert fetches. */
const ALERTS_POLLING_INTERVAL_MS = 4000;

/** Delay (ms) before resolving the offline fallback explanation. */
const OFFLINE_EXPLANATION_DELAY_MS = 1000;

/**
 * Pre-scripted volunteer-friendly explanations keyed by incident_id substring.
 * Used as an offline fallback when the backend is unreachable.
 *
 * @type {Record<string, string>}
 */
const OFFLINE_EXPLANATIONS = {
  crowd:
    'Hey volunteers! We have a crowded bottleneck at Gate B. Please head there immediately. Redirection: direct incoming fans away from Gate B towards Gates A, C, or D where wait lines are shorter. Look out for children or elderly fans who need assistance.',
  med:
    'Team, a medical event has occurred on the Gate C upper escalator. First responders are on scene. Your job: block escalator access and guide incoming crowds to the stairs or main elevator banks on the side.',
  trans:
    'Important notice: Train lines are fully suspended. Passenger backups are forming. Megaphones active. Redirect passengers to queue lines for the shuttle buses. Clear rideshare loading zones so buses can dock.',
  default:
    'An incident has been detected. Please follow your supervisor\'s instructions and report to the nearest team lead for deployment orders.'
};

/**
 * Returns a set of pre-computed mock alerts for the given spike type.
 * Used as an offline fallback when the backend is unreachable.
 *
 * @param {'crowd'|'medical'|'transit'|'clear'} spike - The active spike type.
 * @returns {Array<Object>} Array of alert objects matching the StaffAlertModel schema.
 */
const getLocalAlerts = (spike) => {
  if (spike === 'crowd') {
    return [
      {
        incident_id: 'inc_crowd_local',
        title: 'Critical Crowd Bottleneck at Gate B - Immediate Volunteer Response Required',
        severity: 'Critical',
        crowd_density: '96%',
        recommended_actions: [
          'Immediately deploy all available volunteers and staff to Gate B to assist with crowd management and direct patrons away from the critical bottleneck.',
          'Prioritize identifying and aiding any individuals showing signs of distress (elderly, children, medical needs) within the congested area at Gate B.',
          'Direct incoming patrons towards alternative entry points at Gate A, Gate C, and Gate D, clearly communicating the severe delays at Gate B.',
          'Ensure clear pathways for emergency services are maintained near Gate B and report any incidents or individuals requiring medical attention to control immediately.'
        ],
        confidence_score: 95,
        rationale:
          'The reported bottleneck at Gate B, with flow density exceeding 4.5 persons/sq-meter and a crowd density of 96%, presents a critical safety hazard. Immediate deployment of volunteers to manage crowd flow, identify vulnerable individuals, and divert new arrivals is essential to prevent injuries and maintain order. The high confidence score reflects the specific, actionable data points on density and incident severity.'
      }
    ];
  }
  if (spike === 'medical') {
    return [
      {
        incident_id: 'inc_med_local',
        title: 'Gate C Escalator: High Severity Medical Emergency',
        severity: 'High',
        crowd_density: '80%',
        recommended_actions: [
          'Deploy first aid responders to Gate C upper level escalator immediately.',
          'Station 2 volunteers at the bottom of the escalator to redirect incoming traffic to stairs or elevator.',
          'Maintain clear access lane for EMS medical responders.'
        ],
        confidence_score: 90,
        rationale:
          'A collapsed patron near escalator paths creates an immediate crush/fall risk for oncoming human flows. Active redirection is required while responder treats patient.'
      }
    ];
  }
  if (spike === 'transit') {
    return [
      {
        incident_id: 'inc_trans_local',
        title: 'Transit Hub Terminal Suspension & Overcrowding',
        severity: 'High',
        crowd_density: '92%',
        recommended_actions: [
          'Direct rideshare drivers to alternative loading zone 4 to prevent total roadway gridlock.',
          'Utilize megaphones to direct rail passengers to temporary shuttle buses.',
          'Implement queue barricades to organize passenger buildup.'
        ],
        confidence_score: 88,
        rationale:
          'Suspension of NJ Transit services has halted passenger outflow, creating severe passenger accumulation at rail gates. Bus redirection is needed to bleed the load.'
      }
    ];
  }
  return [];
};

/**
 * React hook managing Staff Copilot alert polling and per-alert explanation state.
 *
 * @param {boolean} isServerOffline - Whether the backend is currently unreachable.
 * @param {'crowd'|'medical'|'transit'|'clear'} activeSpikeType - The currently active spike type.
 * @returns {{ alerts: Array<Object>, explainingAlertId: string|null, alertExplanation: string, loadingExplanation: boolean, setExplainingAlertId: Function, explainIncidentAlert: Function }}
 */
export default function useAlerts(isServerOffline, activeSpikeType) {
  const [alerts, setAlerts] = useState([]);
  const [explainingAlertId, setExplainingAlertId] = useState(null);
  const [alertExplanation, setAlertExplanation] = useState('');
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  /**
   * Fetches fresh alerts from the backend or falls back to local mock alerts.
   * Automatically called on mount and every 4 seconds thereafter.
   */
  async function checkAlerts() {
    try {
      if (isServerOffline) {
        setAlerts(getLocalAlerts(activeSpikeType));
        return;
      }
      const data = await api.fetchAlerts();
      setAlerts(data);
    } catch {
      setAlerts(getLocalAlerts(activeSpikeType));
    }
  }

  /**
   * Fetches a volunteer-friendly explanation for a specific alert.
   * Shows an offline mock explanation when the backend is unreachable.
   *
   * @param {Object} alert - The alert object to explain (must have incident_id field).
   * @param {string} [language='English'] - Target language for the explanation text.
   * @returns {Promise<void>}
   */
  const explainIncidentAlert = async (alert, language = 'English') => {
    setExplainingAlertId(alert.incident_id);
    setLoadingExplanation(true);
    setAlertExplanation('');

    if (isServerOffline) {
      setTimeout(() => {
        const matchKey = Object.keys(OFFLINE_EXPLANATIONS).find(
          (key) => key !== 'default' && alert.incident_id.includes(key)
        );
        setAlertExplanation(OFFLINE_EXPLANATIONS[matchKey] || OFFLINE_EXPLANATIONS.default);
        setLoadingExplanation(false);
      }, OFFLINE_EXPLANATION_DELAY_MS);
      return;
    }

    try {
      const data = await api.explainAlert(alert, language);
      setAlertExplanation(data.explanation);
    } catch {
      setAlertExplanation('Error communicating with backend.');
    } finally {
      setLoadingExplanation(false);
    }
  };

  useEffect(() => {
    checkAlerts();
    const interval = setInterval(checkAlerts, ALERTS_POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isServerOffline, activeSpikeType]);

  return {
    alerts,
    explainingAlertId,
    alertExplanation,
    loadingExplanation,
    setExplainingAlertId,
    explainIncidentAlert
  };
}
