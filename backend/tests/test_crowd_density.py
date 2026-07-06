from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.orchestrator import orchestrator

client = TestClient(app)

@pytest.fixture
def mock_gemini_density():
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
    response = client.post("/api/chat", json={
        "message": "What is the crowd density at Gate B?",
        "accessibility_mode": False
    })
    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert any(t["name"] == "get_crowd_density" for t in data["tools_called"])

def test_crowd_density_invalid_zone():
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
