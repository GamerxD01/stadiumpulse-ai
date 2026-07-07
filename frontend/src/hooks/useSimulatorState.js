/**
 * @fileoverview useSimulatorState — React hook managing live stadium state polling.
 *
 * Polls the FastAPI backend every 4 seconds for real-time crowd density,
 * transit status, incidents, and weather. Falls back to a deterministic local
 * mock simulator (driftMockState) when the server is offline.
 */

import { useState, useEffect } from 'react';
import * as api from '../services/api';

// ---------------------------------------------------------------------------
// Module-level constants — defined outside the hook so they are created once
// and never re-allocated on component re-renders.
// ---------------------------------------------------------------------------

/** Polling interval (ms) between backend state fetches. */
const POLLING_INTERVAL_MS = 4000;

/** Crowd density floor (%) for spike-affected zones during a crowd spike. */
const CROWD_SPIKE_DENSITY_MIN = 85;
/** Crowd density ceiling (%) for spike-affected zones during a crowd spike. */
const CROWD_SPIKE_DENSITY_MAX = 99;

/** Crowd density floor (%) for Transit Hub during a transit spike. */
const TRANSIT_SPIKE_DENSITY_MIN = 90;
/** Crowd density ceiling (%) for Transit Hub during a transit spike. */
const TRANSIT_SPIKE_DENSITY_MAX = 98;

/** Crowd density floor (%) during normal (non-spike) random drift. */
const NORMAL_DENSITY_MIN = 15;
/** Crowd density ceiling (%) during normal (non-spike) random drift. */
const NORMAL_DENSITY_MAX = 75;

/** Transit wait-time floor (mins) during normal random drift. */
const TRANSIT_WAIT_MIN_MINS = 3;
/** Transit wait-time ceiling (mins) during normal random drift. */
const TRANSIT_WAIT_MAX_MINS = 25;

/** Zone names that mirror the backend simulator's zone list. */
const MOCK_ZONES = [
  'Gate A',
  'Gate B',
  'Gate C',
  'Gate D',
  'Concourse East',
  'Concourse West',
  'Seating Bowl',
  'Transit Hub'
];

/** Default stadium state shown before the first successful backend poll. */
const INITIAL_MOCK_STATE = {
  crowd_density: {
    'Gate A': 42,
    'Gate B': 38,
    'Gate C': 45,
    'Gate D': 35,
    'Concourse East': 52,
    'Concourse West': 48,
    'Seating Bowl': 60,
    'Transit Hub': 55
  },
  transit_status: {
    Train: { congestion: 'Medium', wait_time_mins: 10 },
    'Shuttle Bus': { congestion: 'Low', wait_time_mins: 5 },
    Rideshare: { congestion: 'Medium', wait_time_mins: 12 }
  },
  incidents: [],
  weather: { temp: 24.5, condition: 'Partly Cloudy', humidity: 60 }
};

/** Offline incident snapshots keyed by spike type. */
const OFFLINE_INCIDENTS = {
  crowd: [
    {
      id: 'inc_crowd_local',
      type: 'crowd',
      location: 'Gate B',
      severity: 'Critical',
      description: 'Sudden bottle-neck at Gate B turnstiles. Flow density exceeds 4.5 persons/sq-meter.',
      timestamp: 0,
      status: 'Active'
    }
  ],
  medical: [
    {
      id: 'inc_med_local',
      type: 'medical',
      location: 'Gate C Escalator',
      severity: 'High',
      description: 'Elderly fan collapsed near Gate C upper level escalator. First aid responder dispatched.',
      timestamp: 0,
      status: 'Active'
    }
  ],
  transit: [
    {
      id: 'inc_trans_local',
      type: 'transit',
      location: 'Transit Hub',
      severity: 'High',
      description:
        'NJ Transit Rail service suspended temporarily due to switch issue. Heavy passenger buildup at boarding platforms.',
      timestamp: 0,
      status: 'Active'
    }
  ],
  clear: []
};

// ---------------------------------------------------------------------------
// Pure utility — lives outside the hook so it is never re-created on renders.
// ---------------------------------------------------------------------------

/**
 * Computes a locally-drifted clone of the current stadium state for offline simulation.
 *
 * Applies bounded random walks to each zone's density and transit wait times,
 * mirroring the logic in the Python backend's {@link StadiumSimulator.update} method.
 * Spike-affected zones are clamped to tighter bounds matching the backend constants.
 *
 * @param {Object} baseState - The current stadium state snapshot to derive from.
 * @param {'crowd'|'medical'|'transit'|'clear'} spike - Active spike type controlling zone targets.
 * @returns {Object} A new state object with randomised fluctuations applied.
 */
function driftMockState(baseState, spike) {
  const newState = JSON.parse(JSON.stringify(baseState));

  MOCK_ZONES.forEach((zone) => {
    const current = newState.crowd_density[zone];
    if (spike === 'crowd' && (zone === 'Gate B' || zone === 'Concourse West')) {
      newState.crowd_density[zone] = Math.max(
        CROWD_SPIKE_DENSITY_MIN,
        Math.min(CROWD_SPIKE_DENSITY_MAX, current + Math.floor(Math.random() * 5) - 2)
      );
    } else if (spike === 'transit' && zone === 'Transit Hub') {
      newState.crowd_density[zone] = Math.max(
        TRANSIT_SPIKE_DENSITY_MIN,
        Math.min(TRANSIT_SPIKE_DENSITY_MAX, current + Math.floor(Math.random() * 3) - 1)
      );
    } else {
      newState.crowd_density[zone] = Math.max(
        NORMAL_DENSITY_MIN,
        Math.min(NORMAL_DENSITY_MAX, current + Math.floor(Math.random() * 7) - 3)
      );
    }
  });

  Object.keys(newState.transit_status).forEach((mode) => {
    if (spike === 'transit' && (mode === 'Train' || mode === 'Shuttle Bus')) {
      newState.transit_status.Train = { congestion: 'Extreme', wait_time_mins: 45 };
      newState.transit_status['Shuttle Bus'] = { congestion: 'High', wait_time_mins: 25 };
    } else {
      const currentWait = newState.transit_status[mode].wait_time_mins;
      const newWait = Math.max(
        TRANSIT_WAIT_MIN_MINS,
        Math.min(TRANSIT_WAIT_MAX_MINS, currentWait + Math.floor(Math.random() * 5) - 2)
      );
      const congestion = newWait < 8 ? 'Low' : newWait < 15 ? 'Medium' : 'High';
      newState.transit_status[mode] = { congestion, wait_time_mins: newWait };
    }
  });

  // Attach correct offline incident snapshot for the current spike type
  newState.incidents = (OFFLINE_INCIDENTS[spike] || []).map((inc) => ({
    ...inc,
    timestamp: Date.now() / 1000
  }));

  return newState;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * React hook managing live stadium state polling and offline fallback simulation.
 *
 * @returns {{
 *   stadiumState: Object,
 *   isServerOffline: boolean,
 *   activeSpikeType: string,
 *   triggerSimulatorSpike: Function
 * }}
 */
export default function useSimulatorState() {
  const [stadiumState, setStadiumState] = useState(INITIAL_MOCK_STATE);
  const [isServerOffline, setIsServerOffline] = useState(false);
  const [activeSpikeType, setActiveSpikeType] = useState('clear');

  /**
   * Fetches the latest simulator state from the backend and updates local state.
   * On failure, enables offline mode and applies a local drift tick instead.
   *
   * @param {string} spike - The currently active spike type for offline drift targeting.
   */
  async function checkStatus(spike) {
    try {
      const data = await api.fetchStatus();
      setStadiumState(data);
      setIsServerOffline(false);
    } catch {
      setIsServerOffline(true);
      setStadiumState((prev) => driftMockState(prev, spike));
    }
  }

  /**
   * Triggers a named spike on the backend (or locally when offline).
   * Updates activeSpikeType immediately so the mock loop targets the right zones.
   *
   * @param {'crowd'|'medical'|'transit'|'clear'} type - The incident type to simulate.
   * @returns {Promise<void>}
   */
  const triggerSimulatorSpike = async (type) => {
    setActiveSpikeType(type);
    if (isServerOffline) {
      setStadiumState((prev) => driftMockState(prev, type));
      return;
    }
    try {
      await api.triggerSpike(type);
      await checkStatus(type);
    } catch {
      setIsServerOffline(true);
      setStadiumState((prev) => driftMockState(prev, type));
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => checkStatus(activeSpikeType), 0);
    const interval = setInterval(() => checkStatus(activeSpikeType), POLLING_INTERVAL_MS);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [activeSpikeType]);

  return {
    stadiumState,
    isServerOffline,
    activeSpikeType,
    triggerSimulatorSpike
  };
}
