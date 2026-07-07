"""Unit tests for the live safety alert evaluation endpoints in FastAPI.

Covers alert parsing, mock content generation, cache hits, and exception fallbacks.
"""

from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from backend.generator import simulator
from backend.main import app
from backend.orchestrator import orchestrator

client = TestClient(app)


@pytest.fixture(autouse=True)
def ensure_incident():
    """Ensure that the simulator has an active incident to trigger alert evaluation."""
    simulator.trigger_spike("crowd")
    yield
    simulator.trigger_spike("clear")


def test_alerts_happy_path():
    """Verify that get_alerts correctly returns LLM-evaluated response plans under nominal conditions."""
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
    """Verify that get_alerts falls back to predefined baseline safety plans when LLM quota is exhausted."""
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
    """Verify that get_alerts caches evaluated responses and does not re-query Gemini on duplicate requests."""
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


def test_alerts_security_and_safety_spikes():
    """Verify that active security/safety incidents trigger correct structured safety plan generations."""
    original_generate = orchestrator.client.models.generate_content

    # Mock model return value containing a valid StaffAlertModel JSON string
    mock_resp = MagicMock()
    mock_resp.text = """{
        "incident_id": "inc_sec_local",
        "title": "Gate D Security Response Plan",
        "severity": "High",
        "crowd_density": "40%",
        "recommended_actions": ["Deploy guard patrols", "Secure fence perimeter"],
        "confidence_score": 92,
        "rationale": "Intrusion detected at loading zone."
    }"""

    mock_gen = MagicMock(return_value=mock_resp)
    orchestrator.client.models.generate_content = mock_gen

    # Trigger security spike
    simulator.trigger_spike("security")

    # Clear cache so we hit mock
    orchestrator.alerts_cache.clear()

    response = client.get("/api/alerts")
    assert response.status_code == 200
    data = response.json()

    # Verify that the active security alert was generated
    assert len(data) >= 1
    assert data[0]["title"] == "Gate D Security Response Plan"
    assert data[0]["confidence_score"] == 92
    assert "rationale" in data[0]

    # Reset simulator
    simulator.trigger_spike("clear")
    orchestrator.client.models.generate_content = original_generate
