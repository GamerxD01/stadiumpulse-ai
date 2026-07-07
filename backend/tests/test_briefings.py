"""Tests for briefing and alert explanation endpoints.

Covers /api/briefing/shift, /api/briefing/sustainability, and
/api/explain-alert with both happy paths and Gemini exception fallbacks.
"""

from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.orchestrator import orchestrator

client = TestClient(app)


# ---------------------------------------------------------------------------
# Shift Briefing
# ---------------------------------------------------------------------------


@pytest.fixture()
def mock_gemini_shift_briefing():
    """Mock Gemini to return a canned shift briefing text."""
    original_generate = orchestrator.client.models.generate_content

    mock_resp = MagicMock()
    mock_resp.text = (
        "• Gate B density peaked at 96% — crowd successfully rerouted.\n"
        "• Medical responders treated one escalator incident; now resolved.\n"
        "• Transit disruption cleared; normal service resumed."
    )

    orchestrator.client.models.generate_content = MagicMock(return_value=mock_resp)
    yield
    orchestrator.client.models.generate_content = original_generate


@pytest.fixture()
def mock_gemini_shift_exception():
    """Mock Gemini to raise on shift briefing call."""
    original_generate = orchestrator.client.models.generate_content
    orchestrator.client.models.generate_content = MagicMock(side_effect=Exception("Gemini unavailable"))
    yield
    orchestrator.client.models.generate_content = original_generate


def test_shift_briefing_happy_path(mock_gemini_shift_briefing):
    """Shift briefing endpoint returns a non-empty briefing string."""
    response = client.get("/api/briefing/shift")
    assert response.status_code == 200
    data = response.json()
    assert "briefing" in data
    assert len(data["briefing"]) > 10


def test_shift_briefing_gemini_exception_returns_fallback(mock_gemini_shift_exception):
    """When Gemini is down, shift briefing returns a fallback string rather than crashing."""
    response = client.get("/api/briefing/shift")
    assert response.status_code == 200
    data = response.json()
    assert "briefing" in data
    assert len(data["briefing"]) > 0


# ---------------------------------------------------------------------------
# Sustainability Briefing
# ---------------------------------------------------------------------------


@pytest.fixture()
def mock_gemini_sustainability_briefing():
    """Mock Gemini to return a canned sustainability report text."""
    original_generate = orchestrator.client.models.generate_content

    mock_resp = MagicMock()
    mock_resp.text = (
        "MetLife Stadium achieved an 82.4% waste diversion rate this match. "
        "Solar contribution: 8,400 kWh. Water saved: 14,200 gallons. Grade: A-."
    )

    orchestrator.client.models.generate_content = MagicMock(return_value=mock_resp)
    yield
    orchestrator.client.models.generate_content = original_generate


@pytest.fixture()
def mock_gemini_sustainability_exception():
    """Mock Gemini to raise on sustainability briefing call."""
    original_generate = orchestrator.client.models.generate_content
    orchestrator.client.models.generate_content = MagicMock(side_effect=Exception("Quota exceeded"))
    yield
    orchestrator.client.models.generate_content = original_generate


def test_sustainability_briefing_happy_path(mock_gemini_sustainability_briefing):
    """Sustainability briefing endpoint returns a non-empty report string."""
    response = client.get("/api/briefing/sustainability")
    assert response.status_code == 200
    data = response.json()
    assert "report" in data
    assert len(data["report"]) > 10


def test_sustainability_briefing_gemini_exception_returns_fallback(
    mock_gemini_sustainability_exception,
):
    """When Gemini is down, sustainability briefing returns a fallback string."""
    response = client.get("/api/briefing/sustainability")
    assert response.status_code == 200
    data = response.json()
    assert "report" in data
    assert "82.4%" in data["report"] or len(data["report"]) > 0


# ---------------------------------------------------------------------------
# Integrated Decision Brief
# ---------------------------------------------------------------------------


@pytest.fixture()
def mock_gemini_decision_brief():
    """Mock Gemini to return an integrated World Cup decision brief."""
    original_generate = orchestrator.client.models.generate_content

    mock_resp = MagicMock()
    mock_resp.text = """
    {
      "navigation": "Route fans away from Gate B.",
      "crowd_management": "Deploy flow teams to Gate B.",
      "accessibility": "Keep step-free elevator banks staffed.",
      "transportation": "Recommend shuttle buses before rail.",
      "sustainability": "Use eco-mode in low-density zones.",
      "multilingual_assistance": "Broadcast guidance in English and Spanish.",
      "operational_intelligence": "Gate B is the highest pressure zone.",
      "real_time_decision_support": "Open overflow lanes immediately.",
      "priority_level": "High"
    }
    """

    orchestrator.client.models.generate_content = MagicMock(return_value=mock_resp)
    yield
    orchestrator.client.models.generate_content = original_generate


def test_operations_decision_brief_covers_all_challenge_areas(mock_gemini_decision_brief):
    """Decision brief endpoint returns every FIFA World Cup 2026 challenge area."""
    response = client.get("/api/operations/decision-brief")
    assert response.status_code == 200
    data = response.json()
    expected_keys = {
        "navigation",
        "crowd_management",
        "accessibility",
        "transportation",
        "sustainability",
        "multilingual_assistance",
        "operational_intelligence",
        "real_time_decision_support",
        "priority_level",
    }
    assert expected_keys.issubset(data.keys())


def test_operations_decision_brief_fallback_when_gemini_unavailable(mock_gemini_shift_exception):
    """Decision brief endpoint falls back to deterministic simulator-derived guidance."""
    response = client.get("/api/operations/decision-brief?language=Spanish")
    assert response.status_code == 200
    data = response.json()
    assert data["priority_level"] in {"Low", "Medium", "High", "Critical"}
    assert "transportation" in data


# ---------------------------------------------------------------------------
# Explain Alert
# ---------------------------------------------------------------------------


@pytest.fixture()
def mock_gemini_explain_alert():
    """Mock Gemini to return a volunteer-friendly alert explanation."""
    original_generate = orchestrator.client.models.generate_content

    mock_resp = MagicMock()
    mock_resp.text = (
        "Hey volunteers! Crowd bottleneck at Gate B — please redirect fans to Gates A, C, or D immediately."
    )

    orchestrator.client.models.generate_content = MagicMock(return_value=mock_resp)
    yield
    orchestrator.client.models.generate_content = original_generate


@pytest.fixture()
def mock_gemini_explain_exception():
    """Mock Gemini to raise on explain-alert call."""
    original_generate = orchestrator.client.models.generate_content
    orchestrator.client.models.generate_content = MagicMock(side_effect=Exception("Connection timeout"))
    yield
    orchestrator.client.models.generate_content = original_generate


SAMPLE_ALERT = {
    "incident_id": "inc_001",
    "title": "Critical Crowd Bottleneck at Gate B",
    "severity": "Critical",
    "crowd_density": "96%",
    "recommended_actions": ["Redirect fans to Gate A", "Deploy crowd barriers"],
    "confidence_score": 95,
    "rationale": "High density reading at Gate B requires immediate action.",
}


def test_explain_alert_happy_path(mock_gemini_explain_alert):
    """Explain-alert endpoint returns a non-empty explanation."""
    response = client.post(
        "/api/explain-alert",
        json={"alert": SAMPLE_ALERT, "language": "English"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "explanation" in data
    assert len(data["explanation"]) > 0


def test_explain_alert_spanish_language(mock_gemini_explain_alert):
    """Explain-alert accepts non-English language parameter."""
    response = client.post(
        "/api/explain-alert",
        json={"alert": SAMPLE_ALERT, "language": "Spanish"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "explanation" in data


def test_explain_alert_gemini_exception_returns_fallback(mock_gemini_explain_exception):
    """When Gemini is down, explain-alert returns a fallback string."""
    response = client.post(
        "/api/explain-alert",
        json={"alert": SAMPLE_ALERT, "language": "English"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "explanation" in data
    assert len(data["explanation"]) > 0


def test_explain_alert_missing_alert_field():
    """Explain-alert rejects requests missing the required alert field."""
    response = client.post(
        "/api/explain-alert",
        json={"language": "English"},
    )
    assert response.status_code == 422
