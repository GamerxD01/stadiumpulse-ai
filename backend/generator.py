"""Stadium Operations State Generator and Simulator.

This module simulates real-time metrics inside MetLife Stadium during tournament matches,
including zone densities, transit wait times, and emergency incidents.
"""

import random
import time
from typing import Any, Dict, List, Literal

from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Simulator tuning constants — centralised so thresholds are changed in one
# place and never scattered as bare magic numbers throughout the module.
# ---------------------------------------------------------------------------

#: How long (seconds) a triggered spike persists before auto-expiry.
SPIKE_DURATION_SECONDS: float = 60.0

#: State-refresh interval (seconds): get_state() re-runs update() after this gap.
STATE_REFRESH_INTERVAL: float = 4.0

#: Default crowd density (%) assigned to every zone on first boot.
DEFAULT_ZONE_DENSITY: int = 40

#: Crowd density (%) restored to all zones after a 'clear' spike.
CLEAR_ZONE_DENSITY: int = 45

#: Crowd density floor / ceiling during normal (non-spike) random drift.
NORMAL_DENSITY_MIN: int = 15
NORMAL_DENSITY_MAX: int = 75

#: Crowd density floor / ceiling for Gate B / Concourse West during a crowd spike.
CROWD_SPIKE_DENSITY_MIN: int = 85
CROWD_SPIKE_DENSITY_MAX: int = 99

#: Crowd density floor / ceiling for Transit Hub during a transit spike.
TRANSIT_SPIKE_DENSITY_MIN: int = 90
TRANSIT_SPIKE_DENSITY_MAX: int = 98

#: Transit wait-time floor / ceiling during normal random drift (minutes).
TRANSIT_WAIT_MIN_MINS: int = 3
TRANSIT_WAIT_MAX_MINS: int = 25

#: Wait-time thresholds (minutes) for Low / Medium / High congestion labels.
TRANSIT_LOW_THRESHOLD_MINS: int = 8
TRANSIT_HIGH_THRESHOLD_MINS: int = 15

#: Mock weather conditions returned with every state snapshot.
MOCK_WEATHER: Dict[str, Any] = {"temp": 24.5, "condition": "Partly Cloudy", "humidity": 60}

#: Baseline transit state restored after a 'clear' spike.
BASELINE_TRANSIT_STATUS: Dict[str, Dict[str, Any]] = {
    "Train": {"congestion": "Medium", "wait_time_mins": 10},
    "Shuttle Bus": {"congestion": "Low", "wait_time_mins": 5},
    "Rideshare": {"congestion": "Medium", "wait_time_mins": 12},
}

#: Transit values applied during a transit spike.
TRANSIT_SPIKE_TRAIN: Dict[str, Any] = {"congestion": "Extreme", "wait_time_mins": 45}
TRANSIT_SPIKE_SHUTTLE: Dict[str, Any] = {"congestion": "High", "wait_time_mins": 25}

#: Crowd density values injected at the start of each spike type.
CROWD_SPIKE_DENSITIES: Dict[str, int] = {"Gate B": 96, "Concourse West": 88}
MEDICAL_SPIKE_DENSITIES: Dict[str, int] = {"Gate C": 80}
TRANSIT_SPIKE_DENSITIES: Dict[str, int] = {"Transit Hub": 92}


class Incident(BaseModel):
    """Pydantic model representing an operational safety or medical incident."""

    id: str
    type: Literal["medical", "crowd", "transit", "security", "safety"]
    location: str
    severity: Literal["Low", "Medium", "High", "Critical"]
    description: str
    timestamp: float
    status: Literal["Active", "Resolved"]


class StadiumState(BaseModel):
    """Pydantic model representing the overall simulated stadium metrics status."""

    timestamp: float
    crowd_density: Dict[str, int]  # zone -> percentage (0-100)
    transit_status: Dict[str, Dict[str, Any]]  # transport -> {congestion, wait_time_mins}
    incidents: List[Incident]
    weather: Dict[str, Any]


class StadiumSimulator:
    """Simulates real-time crowds, transit schedules, and emergency alerts."""

    def __init__(self) -> None:
        """Initializes the stadium zones, transport status, and state constants."""
        self.zones: List[str] = [
            "Gate A",
            "Gate B",
            "Gate C",
            "Gate D",
            "Concourse East",
            "Concourse West",
            "Seating Bowl",
            "Transit Hub",
        ]
        self.transit_modes: List[str] = ["Train", "Shuttle Bus", "Rideshare"]

        self.crowd_density: Dict[str, int] = dict.fromkeys(self.zones, DEFAULT_ZONE_DENSITY)
        self.transit_status: Dict[str, Dict[str, Any]] = {k: dict(v) for k, v in BASELINE_TRANSIT_STATUS.items()}
        self.incidents: List[Incident] = []
        self.last_update: float = time.time()
        self.spike_active: bool = False
        self.spike_type: str | None = None
        self.spike_end_time: float = 0.0

    def _make_incident(self, spike_type: str, location: str, severity: str, description: str) -> Incident:
        """Constructs and returns a new timestamped Active incident.

        Args:
            spike_type: The incident category (e.g. 'crowd', 'medical', 'transit').
            location: Human-readable zone name where the incident occurred.
            severity: Severity level string ('Low', 'Medium', 'High', or 'Critical').
            description: Prose description of the incident for responders.

        Returns:
            A new Incident instance with status 'Active' and the current timestamp.
        """
        return Incident(
            id=f"inc_{int(time.time())}",
            type=spike_type,  # type: ignore[arg-type]
            location=location,
            severity=severity,  # type: ignore[arg-type]
            description=description,
            timestamp=time.time(),
            status="Active",
        )

    def trigger_spike(self, spike_type: str) -> None:
        """Triggers a simulated congestion or medical emergency incident.

        Args:
            spike_type: The incident spike type to simulate ('crowd', 'medical', 'transit', or 'clear').
        """
        if spike_type == "clear":
            self._clear_all()
            return

        self.spike_active = True
        self.spike_type = spike_type
        self.spike_end_time = time.time() + SPIKE_DURATION_SECONDS

        if spike_type == "crowd":
            self.crowd_density.update(CROWD_SPIKE_DENSITIES)
            self.incidents.append(
                self._make_incident(
                    spike_type="crowd",
                    location="Gate B",
                    severity="Critical",
                    description="Sudden bottle-neck at Gate B turnstiles. Flow density exceeds 4.5 persons/sq-meter.",
                )
            )

        elif spike_type == "medical":
            self.crowd_density.update(MEDICAL_SPIKE_DENSITIES)
            self.incidents.append(
                self._make_incident(
                    spike_type="medical",
                    location="Gate C Escalator",
                    severity="High",
                    description="Elderly fan collapsed near Gate C upper level escalator. Responders dispatched.",
                )
            )

        elif spike_type == "transit":
            self.crowd_density.update(TRANSIT_SPIKE_DENSITIES)
            self.transit_status["Train"] = dict(TRANSIT_SPIKE_TRAIN)
            self.transit_status["Shuttle Bus"] = dict(TRANSIT_SPIKE_SHUTTLE)
            self.incidents.append(
                self._make_incident(
                    spike_type="transit",
                    location="Transit Hub",
                    severity="High",
                    description="NJ Transit Rail service suspended temporarily due to switch issue.",
                )
            )

        elif spike_type == "security":
            # Direct security incident at loading zone
            self.incidents.append(
                self._make_incident(
                    spike_type="security",
                    location="Gate D Loading Dock",
                    severity="High",
                    description="Unidentified individual bypassed perimeter Gate D fence line. Security responding.",
                )
            )

        elif spike_type == "safety":
            # Safety incident near vendor court
            self.incidents.append(
                self._make_incident(
                    spike_type="safety",
                    location="Section 218 Food Court",
                    severity="Medium",
                    description="Minor grease flare-up in vendor ventilation hood. Fire crew on site. Under control.",
                )
            )

    def _clear_all(self) -> None:
        """Resets all spike state, incidents, and crowd metrics to baseline values."""
        self.spike_active = False
        self.spike_type = None
        self.incidents = []
        self.crowd_density = dict.fromkeys(self.zones, CLEAR_ZONE_DENSITY)
        self.transit_status = {k: dict(v) for k, v in BASELINE_TRANSIT_STATUS.items()}

    def _resolve_expired_spike(self, now: float) -> None:
        """Checks spike expiry and resolves all active incidents if the window has elapsed.

        Args:
            now: The current Unix timestamp used for comparison against spike_end_time.
        """
        if self.spike_active and now > self.spike_end_time:
            self.spike_active = False
            self.spike_type = None
            for inc in self.incidents:
                if inc.status == "Active":
                    inc.status = "Resolved"

    def _update_zone_density(self, zone: str) -> None:
        """Applies a bounded random walk to a single zone's crowd density.

        Zones affected by an active spike are clamped to spike-specific bounds;
        all other zones drift within NORMAL_DENSITY_MIN / NORMAL_DENSITY_MAX.

        Args:
            zone: The zone name to update.
        """
        if self.spike_active and self.spike_type == "crowd" and zone in ("Gate B", "Concourse West"):
            delta = random.randint(-2, 2)
            clamped = max(CROWD_SPIKE_DENSITY_MIN, min(CROWD_SPIKE_DENSITY_MAX, self.crowd_density[zone] + delta))
            self.crowd_density[zone] = clamped
        elif self.spike_active and self.spike_type == "transit" and zone == "Transit Hub":
            delta = random.randint(-1, 2)
            clamped = max(TRANSIT_SPIKE_DENSITY_MIN, min(TRANSIT_SPIKE_DENSITY_MAX, self.crowd_density[zone] + delta))
            self.crowd_density[zone] = clamped
        else:
            delta = random.randint(-3, 3)
            clamped = max(NORMAL_DENSITY_MIN, min(NORMAL_DENSITY_MAX, self.crowd_density[zone] + delta))
            self.crowd_density[zone] = clamped

    def _update_transit_mode(self, mode: str) -> None:
        """Applies a bounded random walk to a single transit mode's wait time.

        Spike-locked modes (Train / Shuttle Bus during transit spikes) are skipped.
        Congestion label is derived from thresholds defined in module-level constants.

        Args:
            mode: The transit mode name to update (e.g. 'Train', 'Shuttle Bus').
        """
        if self.spike_active and self.spike_type == "transit" and mode in ("Train", "Shuttle Bus"):
            return
        current_wait = self.transit_status[mode]["wait_time_mins"]
        new_wait = max(TRANSIT_WAIT_MIN_MINS, min(TRANSIT_WAIT_MAX_MINS, current_wait + random.randint(-2, 2)))
        if new_wait < TRANSIT_LOW_THRESHOLD_MINS:
            congestion = "Low"
        elif new_wait < TRANSIT_HIGH_THRESHOLD_MINS:
            congestion = "Medium"
        else:
            congestion = "High"
        self.transit_status[mode] = {"congestion": congestion, "wait_time_mins": new_wait}

    def update(self) -> None:
        """Applies minor random fluctuations to all crowd density and transit values."""
        now = time.time()
        self._resolve_expired_spike(now)
        for zone in self.zones:
            self._update_zone_density(zone)
        for mode in self.transit_modes:
            self._update_transit_mode(mode)
        self.last_update = now

    def get_state(self) -> StadiumState:
        """Retrieves current simulated metrics, triggering an update if the refresh interval has elapsed.

        Returns:
            A StadiumState object containing current sensor counts, transit metrics, and weather.
        """
        if time.time() - self.last_update > STATE_REFRESH_INTERVAL:
            self.update()
        return StadiumState(
            timestamp=time.time(),
            crowd_density=self.crowd_density,
            transit_status=self.transit_status,
            incidents=self.incidents,
            weather=MOCK_WEATHER,
        )


# Global simulator instance
simulator = StadiumSimulator()
