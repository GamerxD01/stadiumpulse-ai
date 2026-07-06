import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from backend.main import app
from backend.generator import simulator
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
