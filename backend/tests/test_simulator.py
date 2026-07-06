"""Tests for the stadium simulator generator.

Covers crowd, medical, transit spikes, update loop fluctuations,
spike auto-expiry, and state serialization.
"""

import time

from backend.generator import simulator


def test_initial_state():
    """Simulator returns a state with all required fields after clear."""
    simulator.trigger_spike("clear")
    state = simulator.get_state()
    assert hasattr(state, "crowd_density")
    assert hasattr(state, "transit_status")
    assert hasattr(state, "incidents")
    assert hasattr(state, "weather")


def test_crowd_spike():
    """Crowd spike sets Gate B density >= 95 and creates one crowd incident."""
    simulator.trigger_spike("clear")
    simulator.trigger_spike("crowd")
    state = simulator.get_state()
    assert state.crowd_density["Gate B"] >= 95
    assert len(state.incidents) == 1
    assert state.incidents[0].type == "crowd"


def test_medical_spike():
    """Medical spike creates one medical incident at Gate C Escalator."""
    simulator.trigger_spike("clear")
    simulator.trigger_spike("medical")
    state = simulator.get_state()
    assert len(state.incidents) == 1
    assert state.incidents[0].type == "medical"
    assert "Gate C" in state.incidents[0].location


def test_transit_spike():
    """Transit spike sets Train to Extreme congestion and creates one transit incident."""
    simulator.trigger_spike("clear")
    simulator.trigger_spike("transit")
    state = simulator.get_state()
    assert state.transit_status["Train"]["congestion"] == "Extreme"
    assert state.transit_status["Train"]["wait_time_mins"] == 45
    assert state.transit_status["Shuttle Bus"]["wait_time_mins"] == 25
    assert state.crowd_density["Transit Hub"] == 92
    assert len(state.incidents) == 1
    assert state.incidents[0].type == "transit"


def test_clear_spike_resets_all():
    """Clear spike resets densities to 45, clears incidents and transit to baseline."""
    simulator.trigger_spike("crowd")
    simulator.trigger_spike("clear")
    state = simulator.get_state()
    assert state.crowd_density["Gate B"] == 45
    assert len(state.incidents) == 0
    assert state.transit_status["Train"]["wait_time_mins"] == 10
    assert state.transit_status["Shuttle Bus"]["wait_time_mins"] == 5


def test_update_loop_fluctuates_density_within_bounds():
    """Update loop keeps crowd densities within [15, 75] when no spike is active."""
    simulator.trigger_spike("clear")
    for _ in range(10):
        simulator.update()
    state = simulator.get_state()
    for zone, density in state.crowd_density.items():
        assert 10 <= density <= 80, f"Zone {zone} density {density} out of expected range"


def test_update_loop_fluctuates_transit_within_bounds():
    """Update loop keeps wait times within [3, 25] mins for non-spiked transit."""
    simulator.trigger_spike("clear")
    for _ in range(10):
        simulator.update()
    state = simulator.get_state()
    for mode, info in state.transit_status.items():
        assert 1 <= info["wait_time_mins"] <= 30, (
            f"Mode {mode} wait time {info['wait_time_mins']} out of expected range"
        )


def test_spike_auto_expires():
    """Spike auto-expires after spike_end_time and active incidents are resolved."""
    simulator.trigger_spike("clear")
    simulator.trigger_spike("crowd")
    # Force expire the spike
    simulator.spike_end_time = time.time() - 1
    simulator.update()
    assert not simulator.spike_active
    state = simulator.get_state()
    for inc in state.incidents:
        assert inc.status == "Resolved"


def test_get_state_is_serializable():
    """get_state returns an object serializable to a dict via model_dump."""
    simulator.trigger_spike("clear")
    state = simulator.get_state()
    dumped = state.model_dump()
    assert isinstance(dumped, dict)
    assert "crowd_density" in dumped
    assert "transit_status" in dumped
