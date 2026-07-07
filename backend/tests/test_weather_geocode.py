"""Tests for weather and geocode proxy endpoints.

Covers /api/weather and /api/geocode with mocked httpx calls,
fallback behavior, and edge cases (no results, API errors).
"""

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# Weather Endpoint
# ---------------------------------------------------------------------------


def test_weather_happy_path():
    """GET /api/weather returns temperature, windspeed and source from Open-Meteo."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "current_weather": {
            "temperature": 24.5,
            "windspeed": 12.3,
            "weathercode": 1,
            "time": "2026-07-06T18:00",
        }
    }

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)

    with patch("backend.main.httpx.AsyncClient", return_value=mock_client):
        response = client.get("/api/weather?lat=40.8135&lon=-74.0744")

    assert response.status_code == 200
    data = response.json()
    assert data["temp"] == 24.5
    assert data["windspeed"] == 12.3
    assert data["source"] == "Open-Meteo API"


def test_weather_fallback_on_exception():
    """GET /api/weather falls back to simulator mock when httpx raises a network error."""
    with patch("backend.main.httpx.AsyncClient", side_effect=httpx.ConnectError("Network error")):
        response = client.get("/api/weather")

    assert response.status_code == 200
    data = response.json()
    # Fallback must include a source field and some weather data
    assert "source" in data
    assert "Simulator Mock" in data["source"]


def test_weather_non_200_api_response():
    """GET /api/weather raises 500 when Open-Meteo returns non-200 and no fallback JSON."""
    mock_response = MagicMock()
    mock_response.status_code = 503
    mock_response.json.return_value = {}

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)

    with patch("backend.main.httpx.AsyncClient", return_value=mock_client):
        response = client.get("/api/weather")

    # When status is non-200 but no exception, endpoint hits the final 500 raise
    assert response.status_code == 500


# ---------------------------------------------------------------------------
# Geocode Endpoint
# ---------------------------------------------------------------------------


def test_geocode_happy_path():
    """GET /api/geocode returns lat/lon for a valid place name query."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = [
        {
            "display_name": "MetLife Stadium, East Rutherford, NJ, USA",
            "lat": "40.8135",
            "lon": "-74.0744",
            "type": "stadium",
        }
    ]

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)

    with patch("backend.main.httpx.AsyncClient", return_value=mock_client):
        response = client.get("/api/geocode?q=MetLife+Stadium")

    assert response.status_code == 200
    data = response.json()
    assert data["lat"] == 40.8135
    assert data["lon"] == -74.0744
    assert data["source"] == "Nominatim OpenStreetMap"


def test_geocode_empty_results():
    """GET /api/geocode returns no-result message when Nominatim finds nothing."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = []

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)

    with patch("backend.main.httpx.AsyncClient", return_value=mock_client):
        response = client.get("/api/geocode?q=ZZZ+Nowhere+Place")

    assert response.status_code == 200
    data = response.json()
    assert data.get("message") == "No locations found"


def test_geocode_api_error_status():
    """GET /api/geocode returns error status when Nominatim returns non-200."""
    mock_response = MagicMock()
    mock_response.status_code = 503

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)

    with patch("backend.main.httpx.AsyncClient", return_value=mock_client):
        response = client.get("/api/geocode?q=MetLife")

    # FastAPI raises HTTPException(503) which the general handler catches and wraps as 500
    assert response.status_code in [500, 503]


def test_geocode_exception_raises_500():
    """GET /api/geocode returns 500 when httpx raises a network-level error."""
    with patch("backend.main.httpx.AsyncClient", side_effect=httpx.ConnectError("DNS failure")):
        response = client.get("/api/geocode?q=MetLife+Stadium")

    assert response.status_code == 500


def test_geocode_missing_q_param():
    """GET /api/geocode returns 422 when query param q is missing."""
    response = client.get("/api/geocode")
    assert response.status_code == 422
