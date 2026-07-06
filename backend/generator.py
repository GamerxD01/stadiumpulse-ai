"""Stadium Operations State Generator and Simulator.

This module simulates real-time metrics inside MetLife Stadium during tournament matches,
including zone densities, transit wait times, and emergency incidents.
"""

import random
import time
from typing import Any, Dict, List

from pydantic import BaseModel


class Incident(BaseModel):
    """Pydantic model representing an operational safety or medical incident."""

    id: str
    type: str  # medical, crowd, transit, security, safety
    location: str
    severity: str  # Low, Medium, High, Critical
    description: str
    timestamp: float
    status: str  # Active, Resolved


class StadiumState(BaseModel):
    """Pydantic model representing the overall simulated stadium metrics status."""

    timestamp: float
    crowd_density: Dict[str, int]  # zone -> percentage (0-100)
    transit_status: Dict[str, Dict[str, Any]]  # transport -> {status, wait_time_mins}
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

        # Initial default states
        self.crowd_density: Dict[str, int] = dict.fromkeys(self.zones, 40)
        self.transit_status: Dict[str, Dict[str, Any]] = {
            "Train": {"congestion": "Medium", "wait_time_mins": 10},
            "Shuttle Bus": {"congestion": "Low", "wait_time_mins": 5},
            "Rideshare": {"congestion": "Medium", "wait_time_mins": 12},
        }
        self.incidents: List[Incident] = []
        self.last_update: float = time.time()
        self.spike_active: bool = False
        self.spike_type: str | None = None
        self.spike_end_time: float = 0.0

    def trigger_spike(self, spike_type: str) -> None:
        """Triggers a simulated congestion or medical emergency incident.

        Args:
            spike_type: The incident spike type to simulate ('crowd', 'medical', 'transit', or 'clear').
        """
        self.spike_active = True
        self.spike_type = spike_type
        self.spike_end_time = time.time() + 60.0  # Spikes last for 60 seconds

        if spike_type == "crowd":
            self.crowd_density["Gate B"] = 96
            self.crowd_density["Concourse West"] = 88
            incident_id = f"inc_{int(time.time())}"
            self.incidents.append(
                Incident(
                    id=incident_id,
                    type="crowd",
                    location="Gate B",
                    severity="Critical",
                    description="Sudden bottle-neck at Gate B turnstiles. Flow density exceeds 4.5 persons/sq-meter.",
                    timestamp=time.time(),
                    status="Active",
                )
            )
        elif spike_type == "medical":
            self.crowd_density["Gate C"] = 80
            incident_id = f"inc_{int(time.time())}"
            self.incidents.append(
                Incident(
                    id=incident_id,
                    type="medical",
                    location="Gate C Escalator",
                    severity="High",
                    description="Elderly fan collapsed near Gate C upper level escalator. Responders dispatched.",
                    timestamp=time.time(),
                    status="Active",
                )
            )
        elif spike_type == "transit":
            self.transit_status["Train"]["congestion"] = "Extreme"
            self.transit_status["Train"]["wait_time_mins"] = 45
            self.transit_status["Shuttle Bus"]["congestion"] = "High"
            self.transit_status["Shuttle Bus"]["wait_time_mins"] = 25
            self.crowd_density["Transit Hub"] = 92

            incident_id = f"inc_{int(time.time())}"
            self.incidents.append(
                Incident(
                    id=incident_id,
                    type="transit",
                    location="Transit Hub",
                    severity="High",
                    description="NJ Transit Rail service suspended temporarily due to switch issue.",
                    timestamp=time.time(),
                    status="Active",
                )
            )
        elif spike_type == "clear":
            self.spike_active = False
            self.spike_type = None
            self.incidents = []
            self.crowd_density = dict.fromkeys(self.zones, 45)
            self.transit_status["Train"] = {"congestion": "Medium", "wait_time_mins": 10}
            self.transit_status["Shuttle Bus"] = {"congestion": "Low", "wait_time_mins": 5}
            self.transit_status["Rideshare"] = {"congestion": "Medium", "wait_time_mins": 12}

    def update(self) -> None:
        """Applies minor random fluctuations to simulator values every step."""
        now = time.time()
        if self.spike_active and now > self.spike_end_time:
            self.spike_active = False
            self.spike_type = None
            for inc in self.incidents:
                if inc.status == "Active":
                    inc.status = "Resolved"

        # Apply random fluctuations to crowd density
        for zone in self.zones:
            if self.spike_active and self.spike_type == "crowd" and zone in ["Gate B", "Concourse West"]:
                self.crowd_density[zone] = max(85, min(99, self.crowd_density[zone] + random.randint(-2, 2)))
            elif self.spike_active and self.spike_type == "transit" and zone == "Transit Hub":
                self.crowd_density[zone] = max(90, min(98, self.crowd_density[zone] + random.randint(-1, 2)))
            else:
                self.crowd_density[zone] = max(15, min(75, self.crowd_density[zone] + random.randint(-3, 3)))

        # Fluctuate transit times slightly
        for mode in self.transit_modes:
            if self.spike_active and self.spike_type == "transit" and mode in ["Train", "Shuttle Bus"]:
                continue
            else:
                current_wait = self.transit_status[mode]["wait_time_mins"]
                new_wait = max(3, min(25, current_wait + random.randint(-2, 2)))
                congestion = "Low" if new_wait < 8 else ("Medium" if new_wait < 15 else "High")
                self.transit_status[mode] = {"congestion": congestion, "wait_time_mins": new_wait}

        self.last_update = now

    def get_state(self) -> StadiumState:
        """Retrieves current simulated metrics, updating them if 4s elapsed since last check.

        Returns:
            A StadiumState object containing current sensor counts, transit metrics, and weather.
        """
        if time.time() - self.last_update > 4.0:
            self.update()
        return StadiumState(
            timestamp=time.time(),
            crowd_density=self.crowd_density,
            transit_status=self.transit_status,
            incidents=self.incidents,
            weather={"temp": 24.5, "condition": "Partly Cloudy", "humidity": 60},
        )


# Global simulator instance
simulator = StadiumSimulator()
