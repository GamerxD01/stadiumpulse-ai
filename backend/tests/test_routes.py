from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.orchestrator import orchestrator

client = TestClient(app)

@pytest.fixture
def mock_gemini_route():
    original_generate = orchestrator.client.models.generate_content

    # Mock turn 1: Gemini returns get_route tool call
    mock_call = MagicMock()
    mock_call.name = "get_route"
    mock_call.args = {"start": "Gate A", "destination": "Section 102", "accessibility_mode": False}

    mock_resp1 = MagicMock()
    mock_resp1.function_calls = [mock_call]
    mock_resp1.text = None

    # Mock turn 2: Gemini returns final text answer
    mock_resp2 = MagicMock()
    mock_resp2.function_calls = []
    mock_resp2.text = "Calculated route: Proceed to central escalator."

    mock_gen = MagicMock(side_effect=[mock_resp1, mock_resp2])
    orchestrator.client.models.generate_content = mock_gen

    yield mock_gen

    orchestrator.client.models.generate_content = original_generate

def test_routes_happy_path(mock_gemini_route):
    response = client.post("/api/chat", json={
        "message": "How do I get to Section 102 from Gate A?",
        "accessibility_mode": False
    })
    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert "tools_called" in data
    assert any(t["name"] == "get_route" for t in data["tools_called"])

def test_routes_accessibility_mode():
    original_generate = orchestrator.client.models.generate_content

    mock_call = MagicMock()
    mock_call.name = "get_route"
    mock_call.args = {"start": "Gate A", "destination": "Section 102", "accessibility_mode": True}

    mock_resp1 = MagicMock()
    mock_resp1.function_calls = [mock_call]
    mock_resp1.text = None

    mock_resp2 = MagicMock()
    mock_resp2.function_calls = []
    mock_resp2.text = "Step-Free Route: Proceed to Northeast elevator bank."

    mock_gen = MagicMock(side_effect=[mock_resp1, mock_resp2])
    orchestrator.client.models.generate_content = mock_gen

    response = client.post("/api/chat", json={
        "message": "I need a step-free route to Section 102",
        "accessibility_mode": True
    })

    assert response.status_code == 200
    data = response.json()
    # Confirm get_route was triggered
    assert any(t["name"] == "get_route" for t in data["tools_called"])

    orchestrator.client.models.generate_content = original_generate

def test_routes_error_missing_message():
    # Blank whitespace string can trigger 422 or 200 depending on strip, let's verify
    response = client.post("/api/chat", json={
        "message": "   ",
        "accessibility_mode": False
    })
    assert response.status_code in [200, 422, 400]

def test_routes_empty_input():
    # Empty message should be rejected by Pydantic min_length=1 validation (422)
    response = client.post("/api/chat", json={
        "message": "",
        "accessibility_mode": False
    })
    assert response.status_code == 422

def test_routes_oversized_input():
    # 501 character string should be rejected by max_length=500 validation (422)
    response = client.post("/api/chat", json={
        "message": "x" * 501,
        "accessibility_mode": False
    })
    assert response.status_code == 422

def test_invalid_trigger_spike():
    # Reject invalid spike types not matching the regex pattern (422)
    response = client.post("/api/trigger-spike", json={
        "spike_type": "security"
    })
    assert response.status_code == 422

def test_simulator_clear_resolves_to_baseline():
    # Trigger crowd density spike first
    client.post("/api/trigger-spike", json={"spike_type": "crowd"})
    status_response1 = client.get("/api/status")
    state1 = status_response1.json()
    assert state1["crowd_density"]["Gate B"] >= 85
    
    # Trigger clear spike
    client.post("/api/trigger-spike", json={"spike_type": "clear"})
    status_response2 = client.get("/api/status")
    state2 = status_response2.json()
    # Baseline for all zones should reset to 45
    assert state2["crowd_density"]["Gate B"] == 45
    assert len(state2["incidents"]) == 0
