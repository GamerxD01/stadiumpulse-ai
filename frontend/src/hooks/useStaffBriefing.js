/**
 * @fileoverview useStaffBriefing — React hook managing Organizer Command Center briefing state.
 *
 * Provides on-demand Gemini-generated shift handover briefings and post-match
 * sustainability report narratives. Falls back to pre-written mock content when
 * the backend is unreachable.
 */

import { useState } from 'react';
import * as api from '../services/api';

/**
 * React hook managing shift briefing and sustainability report generation state.
 *
 * @param {boolean} isServerOffline - Whether the FastAPI backend is currently unreachable.
 * @returns {{
 *   shiftBriefing: string,
 *   loadingShift: boolean,
 *   sustainabilityReport: string,
 *   loadingSustainability: boolean,
 *   generateShiftBriefing: Function,
 *   generateSustainabilityBriefing: Function
 * }}
 */
export default function useStaffBriefing(isServerOffline) {
  const [shiftBriefing, setShiftBriefing] = useState('');
  const [loadingShift, setLoadingShift] = useState(false);
  const [sustainabilityReport, setSustainabilityReport] = useState('');
  const [loadingSustainability, setLoadingSustainability] = useState(false);

  /**
   * Requests an AI-generated shift handover briefing from the backend.
   * Returns a 3-bullet summary of the last 4 hours of stadium incidents.
   * Falls back to a canned briefing string when the server is offline.
   *
   * @returns {Promise<void>}
   */
  const generateShiftBriefing = async () => {
    setLoadingShift(true);
    if (isServerOffline) {
      setTimeout(() => {
        setShiftBriefing(
          '• Operational briefing for shift handover:\n- Gate B turnstiles experienced a critical crowd density peak of 96%. Crowds have been successfully routed to Gates A/C/D.\n- Medical response treated an escalator incident near Gate C; escalators are back in operation.\n- Train transit congestion remains high; rideshare queues remain active at Zone 4.'
        );
        setLoadingShift(false);
      }, 1000);
      return;
    }
    try {
      const data = await api.fetchShiftBriefing();
      setShiftBriefing(data.briefing);
    } catch {
      setShiftBriefing('Error generating shift briefing.');
    } finally {
      setLoadingShift(false);
    }
  };

  /**
   * Requests an AI-generated post-match sustainability narrative from the backend.
   * Covers waste diversion, solar energy, and water conservation metrics.
   * Falls back to a canned report string when the server is offline.
   *
   * @returns {Promise<void>}
   */
  const generateSustainabilityBriefing = async () => {
    setLoadingSustainability(true);
    if (isServerOffline) {
      setTimeout(() => {
        setSustainabilityReport(
          'The sustainability report indicates a solid 82.4% waste recycling diversion rate. Solar contribution added 8,400 kWh of clean power to the stadium grid. General grade: A-. One water anomaly: high usage reported at Concourse East restrooms, resolved by fixtures inspections.'
        );
        setLoadingSustainability(false);
      }, 1000);
      return;
    }
    try {
      const data = await api.fetchSustainabilityBriefing();
      setSustainabilityReport(data.report);
    } catch {
      setSustainabilityReport('Error generating sustainability summary.');
    } finally {
      setLoadingSustainability(false);
    }
  };

  return {
    shiftBriefing,
    loadingShift,
    sustainabilityReport,
    loadingSustainability,
    generateShiftBriefing,
    generateSustainabilityBriefing
  };
}
