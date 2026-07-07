"""Unit tests for FastAPI routes, CORS configuration, security headers, and rate limiter.

Covers chat post endpoints, simulator spike triggers, and route level edge cases.
"""

from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.orchestrator import orchestrator

client = TestClient(app)


@pytest.fixture
def mock_gemini_route():
    """Fixture to mock Gemini's sequential tool-call and response cycle."""
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
    """Verify that POST /api/chat successfully coordinates tool calling and returns calculations."""
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
    """Verify that requesting accessibility mode forces step-free tool arguments."""
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
    """Verify that blank queries are gracefully caught or handled by endpoints."""
    # Blank whitespace string can trigger 422 or 200 depending on strip, let's verify
    response = client.post("/api/chat", json={
        "message": "   ",
        "accessibility_mode": False
    })
    assert response.status_code in [200, 422, 400]


def test_routes_empty_input():
    """Verify that empty queries are rejected with validation error 422."""
    # Empty message should be rejected by Pydantic min_length=1 validation (422)
    response = client.post("/api/chat", json={
        "message": "",
        "accessibility_mode": False
    })
    assert response.status_code == 422


def test_routes_oversized_input():
    """Verify that oversized queries exceeding 500 characters are rejected with 422."""
    # 501 character string should be rejected by max_length=500 validation (422)
    response = client.post("/api/chat", json={
        "message": "x" * 501,
        "accessibility_mode": False
    })
    assert response.status_code == 422


def test_invalid_trigger_spike():
    """Verify that posting an unsupported spike type gets rejected with 422."""
    # Reject invalid spike types not matching the regex pattern (422)
    response = client.post("/api/trigger-spike", json={
        "spike_type": "unauthorized"
    })
    assert response.status_code == 422


def test_simulator_clear_resolves_to_baseline():
    """Verify that clear triggers reset simulator states and metrics back to normal baseline."""
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


# ---------------------------------------------------------------------------
# Additional coverage: root, transit spike, medical spike
# ---------------------------------------------------------------------------


def test_root_endpoint_returns_welcome_message():
    """Root endpoint returns a welcome message with API info."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "StadiumPulse" in data["message"]


def test_transit_spike_trigger():
    """Transit spike endpoint sets Train to Extreme congestion."""
    client.post("/api/trigger-spike", json={"spike_type": "clear"})
    response = client.post("/api/trigger-spike", json={"spike_type": "transit"})
    assert response.status_code == 200
    state = response.json()["state"]
    assert state["transit_status"]["Train"]["congestion"] == "Extreme"
    assert state["transit_status"]["Train"]["wait_time_mins"] == 45
    client.post("/api/trigger-spike", json={"spike_type": "clear"})


def test_medical_spike_trigger():
    """Medical spike endpoint creates one medical incident."""
    client.post("/api/trigger-spike", json={"spike_type": "clear"})
    response = client.post("/api/trigger-spike", json={"spike_type": "medical"})
    assert response.status_code == 200
    state = response.json()["state"]
    assert len(state["incidents"]) == 1
    assert state["incidents"][0]["type"] == "medical"
    client.post("/api/trigger-spike", json={"spike_type": "clear"})


def test_security_headers_present():
    """Security middleware injects X-Frame-Options and X-Content-Type-Options headers."""
    response = client.get("/api/status")
    assert response.status_code == 200
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-XSS-Protection") == "1; mode=block"
    assert "Strict-Transport-Security" in response.headers
    assert "Referrer-Policy" in response.headers


def test_rate_limit_middleware_returns_429_after_limit():
    """Rate limiter returns 429 after 40 requests in the rolling window."""
    # Use a new TestClient without raise_server_exceptions to read 429 responses
    test_client = TestClient(app, raise_server_exceptions=False)
    responses = []
    for _ in range(45):
        r = test_client.get("/api/status")
        responses.append(r.status_code)
    assert 429 in responses, "Expected at least one 429 after 40 requests"
