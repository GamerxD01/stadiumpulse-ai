"""Coverage boost tests for StadiumPulse AI.

Covers missing lines in generator.py and orchestrator.py including Gemini tools
(weather, geocode, transit) and simulator spike types (safety).
"""

import json
import time
from unittest.mock import MagicMock, patch

from backend.generator import simulator
from backend.orchestrator import (
    geocode_location,
    get_transit_status,
    get_weather_forecast,
)


def test_get_transit_status_modes() -> None:
    """Verifies get_transit_status resolves various transit mode strings."""
    # Test Train mode
    train_res = json.loads(get_transit_status("Train"))
    assert train_res["mode"] == "Train"

    # Test Shuttle Bus mode
    shuttle_res = json.loads(get_transit_status("shuttle bus"))
    assert shuttle_res["mode"] == "Shuttle Bus"

    # Test Rideshare mode
    rideshare_res = json.loads(get_transit_status("uber rideshare"))
    assert rideshare_res["mode"] == "Rideshare"


def test_get_weather_forecast_api_success() -> None:
    """Verifies get_weather_forecast fetches temperature from Open-Meteo on 200 OK."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "current_weather": {
            "temperature": 18.5,
            "windspeed": 5.5,
            "weathercode": 2,
            "time": "2026-07-06T19:00",
        }
    }

    with patch("backend.orchestrator.httpx.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_client.get.return_value = mock_resp
        mock_client_cls.return_value.__enter__.return_value = mock_client

        res = json.loads(get_weather_forecast(40.8135, -74.0744))

    assert res["temp"] == 18.5
    assert res["source"] == "Open-Meteo API"


def test_get_weather_forecast_api_offline_fallback() -> None:
    """Verifies get_weather_forecast falls back to simulator weather on failure."""
    # Test HTTP error status
    mock_resp = MagicMock()
    mock_resp.status_code = 500

    with patch("backend.orchestrator.httpx.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_client.get.return_value = mock_resp
        mock_client_cls.return_value.__enter__.return_value = mock_client

        res_500 = json.loads(get_weather_forecast(40.8135, -74.0744))

    assert "source" in res_500
    assert "Simulator Mock" in res_500["source"]

    # Test Exception raised
    with patch("backend.orchestrator.httpx.Client", side_effect=Exception("Connection timed out")):
        res_exc = json.loads(get_weather_forecast(40.8135, -74.0744))

    assert "source" in res_exc
    assert "Simulator Mock" in res_exc["source"]


def test_geocode_location_api_success() -> None:
    """Verifies geocode_location fetches coordinates from Nominatim on 200 OK."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = [
        {
            "display_name": "Gate A MetLife Stadium",
            "lat": "40.8140",
            "lon": "-74.0750",
            "type": "gate",
        }
    ]

    with patch("backend.orchestrator.httpx.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_client.get.return_value = mock_resp
        mock_client_cls.return_value.__enter__.return_value = mock_client

        res = json.loads(geocode_location("Gate A"))

    assert res["lat"] == 40.8140
    assert res["lon"] == -74.0750
    assert res["source"] == "Nominatim OpenStreetMap"


def test_geocode_location_api_offline_fallback() -> None:
    """Verifies geocode_location falls back to MetLife baseline on failure/empty."""
    # Test empty list return
    mock_resp_empty = MagicMock()
    mock_resp_empty.status_code = 200
    mock_resp_empty.json.return_value = []

    with patch("backend.orchestrator.httpx.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_client.get.return_value = mock_resp_empty
        mock_client_cls.return_value.__enter__.return_value = mock_client

        res_empty = json.loads(geocode_location("Unknown Gate Z"))

    assert res_empty["lat"] == 40.8135
    assert res_empty["lon"] == -74.0744

    # Test Exception raised
    with patch("backend.orchestrator.httpx.Client", side_effect=Exception("DNS lookup failure")):
        res_exc = json.loads(geocode_location("Gate B"))

    assert res_exc["lat"] == 40.8135
    assert res_exc["lon"] == -74.0744


def test_simulator_safety_spike() -> None:
    """Verifies simulator correctly triggers safety spike and appends safety incident."""
    simulator._clear_all()
    simulator.trigger_spike("safety")
    assert simulator.spike_active is True
    assert simulator.spike_type == "safety"

    active_safety = [inc for inc in simulator.incidents if inc.type == "safety" and inc.status == "Active"]
    assert len(active_safety) == 1
    assert "Section 218 Food Court" in active_safety[0].location


def test_simulator_expired_spike_resolves_incidents() -> None:
    """Verifies that simulator resolves active incidents when spike time expires."""
    simulator._clear_all()
    simulator.trigger_spike("crowd")
    assert len(simulator.incidents) > 0
    assert all(inc.status == "Active" for inc in simulator.incidents)

    # Set spike expiry time to the past
    simulator.spike_end_time = time.time() - 100.0
    # Run update loop which calls _resolve_expired_spike
    simulator.update()

    assert simulator.spike_active is False
    assert all(inc.status == "Resolved" for inc in simulator.incidents)


def test_simulator_update_walks_under_spikes() -> None:
    """Verifies that simulator update loop properly drifts values during active spikes."""
    # 1. Test crowd spike zone drift
    simulator._clear_all()
    simulator.trigger_spike("crowd")
    simulator.update()
    # Check Gate B and Concourse West are within crowd spike bounds
    assert 85 <= simulator.crowd_density["Gate B"] <= 99
    assert 85 <= simulator.crowd_density["Concourse West"] <= 99

    # 2. Test transit spike zone drift & wait time early return
    simulator._clear_all()
    simulator.trigger_spike("transit")
    simulator.update()
    # Check Transit Hub is within transit spike bounds
    assert 90 <= simulator.crowd_density["Transit Hub"] <= 98
    # Train and Shuttle Bus wait times should be locked
    assert simulator.transit_status["Train"]["wait_time_mins"] == 45
    assert simulator.transit_status["Shuttle Bus"]["wait_time_mins"] == 25


def test_sustainability_optimize_endpoint() -> None:
    """Verifies GET /api/sustainability/optimize returns optimization suggestions."""
    from fastapi.testclient import TestClient

    from backend.main import app

    client = TestClient(app)
    mock_resp = MagicMock()
    mock_resp.text = json.dumps(
        {"optimizations": [{"area": "Energy", "recommendation": "Eco mode active", "impact": "High"}]}
    )

    with patch("backend.orchestrator.orchestrator.client.models.generate_content", return_value=mock_resp):
        response = client.get("/api/sustainability/optimize")

    assert response.status_code == 200
    data = response.json()
    assert "optimizations" in data
    assert len(data["optimizations"]) > 0
    assert data["optimizations"][0]["area"] == "Energy"


def test_transportation_recommend_endpoint() -> None:
    """Verifies GET /api/transportation/recommend returns recommendations."""
    from fastapi.testclient import TestClient

    from backend.main import app

    client = TestClient(app)
    mock_resp = MagicMock()
    mock_resp.text = json.dumps(
        {"recommended_mode": "Train", "reasoning": "Fastest option", "suggested_departure_window": "Leave now"}
    )

    with patch("backend.orchestrator.orchestrator.client.models.generate_content", return_value=mock_resp):
        response = client.get("/api/transportation/recommend")

    assert response.status_code == 200
    data = response.json()
    assert data["recommended_mode"] == "Train"
    assert data["reasoning"] == "Fastest option"


def test_sustainability_optimize_endpoint_fallback() -> None:
    """Verifies GET /api/sustainability/optimize returns static recommendations on exception."""
    from fastapi.testclient import TestClient

    from backend.main import app

    client = TestClient(app)

    with patch(
        "backend.orchestrator.orchestrator.client.models.generate_content", side_effect=Exception("API limit reached")
    ):
        response = client.get("/api/sustainability/optimize")

    assert response.status_code == 200
    data = response.json()
    assert "optimizations" in data
    assert len(data["optimizations"]) == 3
    assert data["optimizations"][0]["area"] == "Energy"


def test_transportation_recommend_endpoint_fallback() -> None:
    """Verifies GET /api/transportation/recommend returns computed recommendations on exception."""
    from fastapi.testclient import TestClient

    from backend.main import app

    client = TestClient(app)

    with patch(
        "backend.orchestrator.orchestrator.client.models.generate_content", side_effect=Exception("API offline")
    ):
        response = client.get("/api/transportation/recommend")

    assert response.status_code == 200
    data = response.json()
    assert "recommended_mode" in data
    assert "reasoning" in data
