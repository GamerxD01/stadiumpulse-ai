import pytest
from backend.generator import simulator

def test_initial_state():
    simulator.trigger_spike("clear")
    state = simulator.get_state()
    assert hasattr(state, "crowd_density")
    assert hasattr(state, "transit_status")
    assert hasattr(state, "incidents")
    assert hasattr(state, "weather")

def test_incident_spikes():
    # Spike crowd
    simulator.trigger_spike("clear")
    simulator.trigger_spike("crowd")
    state = simulator.get_state()
    assert state.crowd_density["Gate B"] >= 95
    assert len(state.incidents) == 1
    assert state.incidents[0].type == "crowd"

    # Spike medical
    simulator.trigger_spike("clear")
    simulator.trigger_spike("medical")
    state = simulator.get_state()
    assert len(state.incidents) == 1
    assert state.incidents[0].type == "medical"

    # Clear spikes
    simulator.trigger_spike("clear")
    state = simulator.get_state()
    assert state.crowd_density["Gate B"] < 50
    assert len(state.incidents) == 0
