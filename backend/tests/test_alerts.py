from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from backend.generator import simulator
from backend.main import app
from backend.orchestrator import orchestrator

client = TestClient(app)

@pytest.fixture(autouse=True)
def ensure_incident():
    # Make sure simulator has an active incident to trigger evaluate_alerts
    simulator.trigger_spike("crowd")
    yield
    simulator.trigger_spike("clear")

def test_alerts_happy_path():
    original_generate = orchestrator.client.models.generate_content

    # Mock model return value containing a valid StaffAlertModel JSON string
    mock_resp = MagicMock()
    mock_resp.text = """{
        "incident_id": "inc_crowd_local",
        "title": "Gate B Congestion Plan",
        "severity": "Critical",
        "crowd_density": "96%",
        "recommended_actions": ["Deploy staff", "Redirect fans"],
        "confidence_score": 95,
        "rationale": "High turnstile loads detected."
    }"""

    mock_gen = MagicMock(return_value=mock_resp)
    orchestrator.client.models.generate_content = mock_gen

    # Clear cache so we hit mock
    orchestrator.alerts_cache.clear()

    response = client.get("/api/alerts")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["title"] == "Gate B Congestion Plan"
    assert data[0]["confidence_score"] == 95
    assert "rationale" in data[0]

    orchestrator.client.models.generate_content = original_generate

def test_alerts_api_failure_fallback():
    original_generate = orchestrator.client.models.generate_content

    # Mock model to throw an exception (e.g. rate limit 429)
    mock_gen = MagicMock(side_effect=Exception("Gemini quota exhausted (429)"))
    orchestrator.client.models.generate_content = mock_gen

    # Clear cache to force API call and hit exception block
    orchestrator.alerts_cache.clear()

    response = client.get("/api/alerts")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    # Check that fallback values are set
    assert "Fallback" in data[0]["rationale"] or "fallback" in data[0]["rationale"]
    assert data[0]["confidence_score"] == 75
    assert len(data[0]["recommended_actions"]) == 3

    orchestrator.client.models.generate_content = original_generate

def test_alerts_cache_hit():
    original_generate = orchestrator.client.models.generate_content

    mock_resp = MagicMock()
    mock_resp.text = """{
        "incident_id": "inc_crowd_local",
        "title": "Gate B Cache Plan",
        "severity": "Critical",
        "crowd_density": "96%",
        "recommended_actions": ["Deploy staff"],
        "confidence_score": 90,
        "rationale": "Caching validation test."
    }"""

    mock_gen = MagicMock(return_value=mock_resp)
    orchestrator.client.models.generate_content = mock_gen

    # Clear cache first
    orchestrator.alerts_cache.clear()

    # Call 1: should trigger generate_content (call_count = 1)
    response1 = client.get("/api/alerts")
    assert response1.status_code == 200

    # Call 2: should hit cache directly, no model call (call_count stays 1)
    response2 = client.get("/api/alerts")
    assert response2.status_code == 200

    assert mock_gen.call_count == 1

    orchestrator.client.models.generate_content = original_generate
