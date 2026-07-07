"""Unit tests for crowd density evaluation, threshold routing, and accessibility services.

Covers density state classifications and Nominatim OSM fallback lookups.
"""

import json as _json
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from backend.generator import simulator
from backend.main import app
from backend.orchestrator import get_accessibility_info, get_crowd_density, orchestrator

client = TestClient(app)


@pytest.fixture
def mock_gemini_density():
    """Fixture to mock Gemini's density retrieval model call flow."""
    original_generate = orchestrator.client.models.generate_content

    # Mock turn 1: Gemini returns get_crowd_density tool call
    mock_call = MagicMock()
    mock_call.name = "get_crowd_density"
    mock_call.args = {"zone": "Gate B"}

    mock_resp1 = MagicMock()
    mock_resp1.function_calls = [mock_call]
    mock_resp1.text = None

    # Mock turn 2: Gemini returns final text answer
    mock_resp2 = MagicMock()
    mock_resp2.function_calls = []
    mock_resp2.text = "Gate B density is currently 38%."

    mock_gen = MagicMock(side_effect=[mock_resp1, mock_resp2])
    orchestrator.client.models.generate_content = mock_gen

    yield mock_gen

    orchestrator.client.models.generate_content = original_generate


def test_crowd_density_happy_path(mock_gemini_density):
    """Verify that posting a request for density correctly coordinates tool calling."""
    response = client.post("/api/chat", json={
        "message": "What is the crowd density at Gate B?",
        "accessibility_mode": False
    })
    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert any(t["name"] == "get_crowd_density" for t in data["tools_called"])


def test_crowd_density_invalid_zone():
    """Verify that requesting density for an unknown zone triggers correct tool error logic."""
    original_generate = orchestrator.client.models.generate_content

    # Mock turn 1: Gemini returns get_crowd_density tool call for non-existing zone
    mock_call = MagicMock()
    mock_call.name = "get_crowd_density"
    mock_call.args = {"zone": "Unknown Zone"}

    mock_resp1 = MagicMock()
    mock_resp1.function_calls = [mock_call]
    mock_resp1.text = None

    # Mock turn 2: Gemini returns final text answer explaining the error
    mock_resp2 = MagicMock()
    mock_resp2.function_calls = []
    mock_resp2.text = "Sorry, I could not find data for that zone."

    mock_gen = MagicMock(side_effect=[mock_resp1, mock_resp2])
    orchestrator.client.models.generate_content = mock_gen

    response = client.post("/api/chat", json={
        "message": "Check density at Unknown Zone",
        "accessibility_mode": False
    })
    assert response.status_code == 200
    data = response.json()
    assert any(t["name"] == "get_crowd_density" for t in data["tools_called"])

    orchestrator.client.models.generate_content = original_generate


# ---------------------------------------------------------------------------
# Direct unit tests for tool functions — covers threshold branches in orchestrator
# ---------------------------------------------------------------------------

def test_get_crowd_density_critical_status():
    """Density >= 90 maps to 'Critical (Overcrowding alert)' status."""
    simulator.trigger_spike("clear")
    simulator.crowd_density["Gate B"] = 95
    result = _json.loads(get_crowd_density("Gate B"))
    assert result["status"] == "Critical (Overcrowding alert)"
    assert result["density_percentage"] == 95
    simulator.trigger_spike("clear")


def test_get_crowd_density_high_status():
    """Density >= 75 and < 90 maps to 'High (Moderate congestion)' status."""
    simulator.trigger_spike("clear")
    simulator.crowd_density["Gate A"] = 80
    result = _json.loads(get_crowd_density("Gate A"))
    assert result["status"] == "High (Moderate congestion)"
    simulator.trigger_spike("clear")


def test_get_crowd_density_medium_status():
    """Density >= 50 and < 75 maps to 'Medium' status."""
    simulator.trigger_spike("clear")
    simulator.crowd_density["Concourse East"] = 60
    result = _json.loads(get_crowd_density("Concourse East"))
    assert result["status"] == "Medium"
    simulator.trigger_spike("clear")


def test_get_crowd_density_low_status():
    """Density < 50 maps to 'Low' status."""
    simulator.trigger_spike("clear")
    simulator.crowd_density["Gate C"] = 30
    result = _json.loads(get_crowd_density("Gate C"))
    assert result["status"] == "Low"
    simulator.trigger_spike("clear")


def test_get_accessibility_info_known_zone():
    """get_accessibility_info returns structured ADA data for a known zone."""
    result = _json.loads(get_accessibility_info("Gate A"))
    assert "elevators" in result
    assert "ada_restrooms" in result
    assert "hearing_loop" in result
    assert result["zone"] == "Gate A"


def test_get_accessibility_info_unknown_zone():
    """get_accessibility_info returns hotline fallback for an unknown zone."""
    result = _json.loads(get_accessibility_info("Unknown Sector 99"))
    assert "ada_hotline" in result
    assert "note" in result
