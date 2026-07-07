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
export default function useStaffBriefing(isServerOffline, language = 'English') {
  const [shiftBriefing, setShiftBriefing] = useState('');
  const [loadingShift, setLoadingShift] = useState(false);
  const [sustainabilityReport, setSustainabilityReport] = useState('');
  const [loadingSustainability, setLoadingSustainability] = useState(false);
  const [sustainabilityOptimizations, setSustainabilityOptimizations] = useState([]);
  const [loadingOptimizations, setLoadingOptimizations] = useState(false);
  const [transportationRecommendation, setTransportationRecommendation] = useState(null);
  const [loadingTransportation, setLoadingTransportation] = useState(false);
  const [decisionBrief, setDecisionBrief] = useState(null);
  const [loadingDecisionBrief, setLoadingDecisionBrief] = useState(false);

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
        const isSpanish = language === 'Spanish';
        const txt = isSpanish
          ? '• Resumen operativo para el cambio de turno:\n- Los torniquetes de la Puerta B registraron un pico crítico de densidad de multitud del 96%. Los aficionados fueron desviados con éxito a las Puertas A/C/D.\n- El equipo de respuesta médica atendió un incidente en la escalera mecánica cerca de la Puerta C; las escaleras mecánicas han vuelto a funcionar.\n- La congestión del transporte ferroviario sigue siendo alta; las colas para viajes compartidos siguen activas en la Zona 4.'
          : '• Operational briefing for shift handover:\n- Gate B turnstiles experienced a critical crowd density peak of 96%. Crowds have been successfully routed to Gates A/C/D.\n- Medical response treated an escalator incident near Gate C; escalators are back in operation.\n- Train transit congestion remains high; rideshare queues remain active at Zone 4.';
        setShiftBriefing(txt);
        setLoadingShift(false);
      }, 1000);
      return;
    }
    try {
      const data = await api.fetchShiftBriefing(language);
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
        const isSpanish = language === 'Spanish';
        const txt = isSpanish
          ? 'El informe de sostenibilidad indica una tasa sólida del 82.4% de desvío de reciclaje de residuos. La contribución solar agregó 8,400 kWh de energía limpia a la red eléctrica del estadio. Calificación general: A-. Una anomalía del agua: alto consumo informado en los baños de Concourse East, resuelto mediante inspecciones de accesorios.'
          : 'The sustainability report indicates a solid 82.4% waste recycling diversion rate. Solar contribution added 8,400 kWh of clean power to the stadium grid. General grade: A-. One water anomaly: high usage reported at Concourse East restrooms, resolved by fixtures inspections.';
        setSustainabilityReport(txt);
        setLoadingSustainability(false);
      }, 1000);
      return;
    }
    try {
      const data = await api.fetchSustainabilityBriefing(language);
      setSustainabilityReport(data.report);
    } catch {
      setSustainabilityReport('Error generating sustainability summary.');
    } finally {
      setLoadingSustainability(false);
    }
  };

  /**
   * Requests GenAI sustainability optimization actions from the live simulator state.
   *
   * @returns {Promise<void>}
   */
  const generateSustainabilityOptimizations = async () => {
    setLoadingOptimizations(true);
    if (isServerOffline) {
      setTimeout(() => {
        setSustainabilityOptimizations([
          {
            area: 'Energy',
            recommendation: 'Move Gate D escalators to eco-mode while density remains below 40%.',
            impact: 'High'
          },
          {
            area: 'Waste',
            recommendation: 'Send recycling staff to Concourse East before the post-match food surge.',
            impact: 'Medium'
          },
          {
            area: 'Water',
            recommendation: 'Reduce restroom water pressure in low-traffic seating sections by 10%.',
            impact: 'Medium'
          }
        ]);
        setLoadingOptimizations(false);
      }, 1000);
      return;
    }
    try {
      const data = await api.fetchSustainabilityOptimizations();
      setSustainabilityOptimizations(data.optimizations || []);
    } catch {
      setSustainabilityOptimizations([
        {
          area: 'Operations',
          recommendation: 'Optimization advisor is unavailable. Continue baseline resource monitoring.',
          impact: 'Low'
        }
      ]);
    } finally {
      setLoadingOptimizations(false);
    }
  };

  /**
   * Requests live transportation recommendation for fan departure planning.
   *
   * @returns {Promise<void>}
   */
  const generateTransportationRecommendation = async () => {
    setLoadingTransportation(true);
    if (isServerOffline) {
      setTimeout(() => {
        setTransportationRecommendation({
          recommended_mode: 'Shuttle Bus',
          reasoning: 'Shuttle buses currently have the shortest simulated wait and avoid train platform buildup.',
          suggested_departure_window: 'Depart within the next 15 minutes before the final-whistle surge.'
        });
        setLoadingTransportation(false);
      }, 1000);
      return;
    }
    try {
      const data = await api.fetchTransportationRecommendation();
      setTransportationRecommendation(data);
    } catch {
      setTransportationRecommendation({
        recommended_mode: 'Monitor',
        reasoning: 'Transportation advisor is unavailable. Use the live wait-time table for manual routing.',
        suggested_departure_window: 'Recheck after the next simulator refresh.'
      });
    } finally {
      setLoadingTransportation(false);
    }
  };

  /**
   * Requests an integrated command-center decision brief covering every challenge area.
   *
   * @returns {Promise<void>}
   */
  const generateDecisionBrief = async () => {
    setLoadingDecisionBrief(true);
    if (isServerOffline) {
      setTimeout(() => {
        setDecisionBrief({
          priority_level: 'High',
          navigation: 'Route fans from Gate B toward Gate A and Concourse East to reduce entry pressure.',
          crowd_management: 'Deploy volunteers to Gate B and Concourse West until densities fall below 75%.',
          accessibility: 'Reserve Elevator Bank North-West for step-free detours and ADA guest assistance.',
          transportation: 'Recommend Shuttle Bus departures first because current train waits remain elevated.',
          sustainability: 'Move escalators in low-density zones to eco-mode and redeploy cleaning staff by density.',
          multilingual_assistance: 'Publish the same route alert in English, Spanish, Arabic, and Portuguese.',
          operational_intelligence: 'Gate B is the main pressure point for the next shift handover.',
          real_time_decision_support: 'Open overflow lanes now if the next sensor refresh stays above 85% density.'
        });
        setLoadingDecisionBrief(false);
      }, 1000);
      return;
    }
    try {
      const data = await api.fetchOperationsDecisionBrief(language);
      setDecisionBrief(data);
    } catch {
      setDecisionBrief({
        priority_level: 'Monitor',
        navigation: 'Decision brief is unavailable. Continue using live density and transit panels.',
        crowd_management: 'Maintain standard crowd monitoring.',
        accessibility: 'Keep ADA support staff posted at guest services.',
        transportation: 'Use current wait-time table for manual transit recommendations.',
        sustainability: 'Continue baseline resource monitoring.',
        multilingual_assistance: 'Use prepared multilingual safety templates.',
        operational_intelligence: 'Supervisor review required.',
        real_time_decision_support: 'Recheck after the next simulator refresh.'
      });
    } finally {
      setLoadingDecisionBrief(false);
    }
  };

  return {
    shiftBriefing,
    loadingShift,
    sustainabilityReport,
    loadingSustainability,
    sustainabilityOptimizations,
    loadingOptimizations,
    transportationRecommendation,
    loadingTransportation,
    decisionBrief,
    loadingDecisionBrief,
    generateShiftBriefing,
    generateSustainabilityBriefing,
    generateSustainabilityOptimizations,
    generateTransportationRecommendation,
    generateDecisionBrief
  };
}
