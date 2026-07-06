/**
 * @fileoverview useSimulatorState — React hook managing live stadium state polling.
 *
 * Polls the FastAPI backend every 4 seconds for real-time crowd density,
 * transit status, incidents, and weather. Falls back to a deterministic local
 * mock simulator (driftMockState) when the server is offline.
 */

import { useState, useEffect } from 'react';
import * as api from '../services/api';

const mockZones = [
  'Gate A',
  'Gate B',
  'Gate C',
  'Gate D',
  'Concourse East',
  'Concourse West',
  'Seating Bowl',
  'Transit Hub'
];

const initialMockState = {
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

/**
 * Computes a locally-drifted clone of the stadium state for offline simulation.
 *
 * @param {Object} baseState - The current stadium state snapshot to mutate from.
 * @param {'crowd'|'medical'|'transit'|'clear'} spike - Active spike type controlling zone targets.
 * @returns {Object} A new state object with randomised density and transit fluctuations applied.
 */
export default function useSimulatorState() {
  const [stadiumState, setStadiumState] = useState(initialMockState);
  const [isServerOffline, setIsServerOffline] = useState(false);
  const [activeSpikeType, setActiveSpikeType] = useState('clear');

  const driftMockState = (baseState, spike) => {
    const newState = JSON.parse(JSON.stringify(baseState));

    mockZones.forEach((zone) => {
      if (spike === 'crowd' && (zone === 'Gate B' || zone === 'Concourse West')) {
        newState.crowd_density[zone] = Math.max(
          85,
          Math.min(99, newState.crowd_density[zone] + Math.floor(Math.random() * 5) - 2)
        );
      } else if (spike === 'transit' && zone === 'Transit Hub') {
        newState.crowd_density[zone] = Math.max(
          90,
          Math.min(98, newState.crowd_density[zone] + Math.floor(Math.random() * 3) - 1)
        );
      } else {
        newState.crowd_density[zone] = Math.max(
          15,
          Math.min(75, newState.crowd_density[zone] + Math.floor(Math.random() * 7) - 3)
        );
      }
    });

    Object.keys(newState.transit_status).forEach((mode) => {
      if (spike === 'transit' && (mode === 'Train' || mode === 'Shuttle Bus')) {
        newState.transit_status['Train'] = { congestion: 'Extreme', wait_time_mins: 45 };
        newState.transit_status['Shuttle Bus'] = { congestion: 'High', wait_time_mins: 25 };
      } else {
        let currentWait = newState.transit_status[mode].wait_time_mins;
        let newWait = Math.max(3, Math.min(25, currentWait + Math.floor(Math.random() * 5) - 2));
        let congestion = newWait < 8 ? 'Low' : newWait < 15 ? 'Medium' : 'High';
        newState.transit_status[mode] = { congestion, wait_time_mins: newWait };
      }
    });

    if (spike === 'crowd') {
      newState.incidents = [
        {
          id: 'inc_crowd_local',
          type: 'crowd',
          location: 'Gate B',
          severity: 'Critical',
          description: 'Sudden bottle-neck at Gate B turnstiles. Flow density exceeds 4.5 persons/sq-meter.',
          timestamp: Date.now() / 1000,
          status: 'Active'
        }
      ];
    } else if (spike === 'medical') {
      newState.incidents = [
        {
          id: 'inc_med_local',
          type: 'medical',
          location: 'Gate C Escalator',
          severity: 'High',
          description: 'Elderly fan collapsed near Gate C upper level escalator. First aid responder dispatched.',
          timestamp: Date.now() / 1000,
          status: 'Active'
        }
      ];
    } else if (spike === 'transit') {
      newState.incidents = [
        {
          id: 'inc_trans_local',
          type: 'transit',
          location: 'Transit Hub',
          severity: 'High',
          description:
            'NJ Transit Rail service suspended temporarily due to switch issue. Heavy passenger buildup at boarding platforms.',
          timestamp: Date.now() / 1000,
          status: 'Active'
        }
      ];
    } else {
      newState.incidents = [];
    }

    return newState;
  };

  /**
   * Fetches the latest simulator state from the backend and updates local state.
   * On failure, enables offline mode and applies a local drift tick instead.
   */
  async function checkStatus() {
    try {
      const data = await api.fetchStatus();
      setStadiumState(data);
      setIsServerOffline(false);
    } catch {
      setIsServerOffline(true);
      setStadiumState((prev) => driftMockState(prev, activeSpikeType));
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
      await checkStatus();
    } catch {
      setIsServerOffline(true);
      setStadiumState((prev) => driftMockState(prev, type));
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkStatus();
    const interval = setInterval(checkStatus, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSpikeType]);

  return {
    stadiumState,
    isServerOffline,
    activeSpikeType,
    setIsServerOffline,
    triggerSimulatorSpike
  };
}
