"""StadiumPulse AI FastAPI Backend Server.

Exposes REST API endpoints for real-time state simulator status, trigger spikes,
Nominatim OSM geocoding, Open-Meteo weather forecast, and Gemini orchestrations.
"""

import json
import logging
import os
import time
from typing import Any, Dict, List

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from starlette.middleware.base import BaseHTTPMiddleware

from backend.generator import simulator
from backend.orchestrator import orchestrator

load_dotenv()

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Server tuning constants
# ---------------------------------------------------------------------------

#: Maximum API requests allowed per IP within the rolling window.
RATE_LIMIT_REQUESTS: int = 40

#: Duration (seconds) of the rolling rate-limit window.
RATE_LIMIT_WINDOW_SECONDS: int = 60

#: HTTP client timeout (seconds) used for all outbound third-party API calls.
HTTP_CLIENT_TIMEOUT_SECONDS: float = 5.0


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Custom async in-memory rolling-window rate limiter per IP address."""

    def __init__(self, app: Any, limit: int = 40, window: int = 60) -> None:
        """Initializes the rate limiter constants.

        Args:
            app: The ASGI app reference.
            limit: Allowed request count per window.
            window: Rolling window duration in seconds.
        """
        super().__init__(app)
        self.limit = limit
        self.window = window
        self.requests: Dict[str, List[float]] = {}

    async def dispatch(self, request: Request, call_next: Any) -> Any:
        """Limits rate requests on all API routes.

        Args:
            request: The incoming FastAPI HTTP request.
            call_next: The next ASGI dispatch handler.
        """
        if not request.url.path.startswith("/api/"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = time.time()

        client_requests = self.requests.get(client_ip, [])
        client_requests = [t for t in client_requests if now - t < self.window]

        if len(client_requests) >= self.limit:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please slow down and try again later."},
            )

        client_requests.append(now)
        self.requests[client_ip] = client_requests

        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Custom middleware enforcing security headers (CSP, XFO, Referrer-Policy)."""

    async def dispatch(self, request: Request, call_next: Any) -> Any:
        """Enforces browser security parameters in responses.

        Args:
            request: The incoming FastAPI HTTP request.
            call_next: The next ASGI dispatch handler.
        """
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "connect-src 'self' "
            "https://stadiumpulse-qn3icch8g-foxxys-projects-0b305d67.vercel.app "
            "https://stadiumpulse-ai.vercel.app "
            "https://api.open-meteo.com "
            "https://nominatim.openstreetmap.org "
            "https://generativelanguage.googleapis.com;"
        )
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


app = FastAPI(title="StadiumPulse AI Backend")

# Register custom middleware layers
app.add_middleware(RateLimitMiddleware, limit=RATE_LIMIT_REQUESTS, window=RATE_LIMIT_WINDOW_SECONDS)
app.add_middleware(SecurityHeadersMiddleware)

# Restrict CORS to local development and specific deployment domains
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://stadiumpulse-qn3icch8g-foxxys-projects-0b305d67.vercel.app",
    "https://stadiumpulse-ai.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handles HTTPExceptions gracefully.

    Args:
        request: The incoming request.
        exc: The HTTP Exception.
    """
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catches unhandled errors returning a generic error, preventing credential leakage.

    Args:
        request: The incoming request.
        exc: The raw exception thrown.
    """
    logger.exception("Unhandled server error: %s", str(exc))
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal operational error occurred. The team has been notified."},
    )


# Load config parameters
NOMINATIM_USER_AGENT = os.getenv("NOMINATIM_USER_AGENT", "StadiumPulseAI/1.0")
OPEN_METEO_BASE_URL = os.getenv("OPEN_METEO_BASE_URL", "https://api.open-meteo.com/v1")


class SpikeRequest(BaseModel):
    """Pydantic request validator for incident control panel triggers."""

    spike_type: str = Field(..., pattern="^(crowd|medical|transit|security|safety|clear)$")


@app.get("/")
def read_root() -> Dict[str, str]:
    """Exposes a welcome index message at the backend root."""
    return {"message": "StadiumPulse AI API is live! Access endpoints under /api/*"}


@app.get("/api/status")
def get_status() -> Any:
    """Exposes the live stadium state simulator indices."""
    return simulator.get_state()


@app.post("/api/trigger-spike")
def trigger_spike(req: SpikeRequest) -> Dict[str, Any]:
    """Simulates an overcrowding or medical incident scenario."""
    valid_types = ["crowd", "medical", "transit", "security", "safety", "clear"]
    if req.spike_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid spike_type. Must be one of {valid_types}")
    simulator.trigger_spike(req.spike_type)
    return {"message": f"Spike '{req.spike_type}' successfully triggered.", "state": simulator.get_state()}


@app.get("/api/weather")
async def get_weather(lat: float = 40.8135, lon: float = -74.0744) -> Dict[str, Any]:
    """Queries live weather updates from Open-Meteo.

    Args:
        lat: Latitude coordinate.
        lon: Longitude coordinate.
    """
    url = f"{OPEN_METEO_BASE_URL}/forecast?latitude={lat}&longitude={lon}&current_weather=true"
    try:
        async with httpx.AsyncClient(timeout=HTTP_CLIENT_TIMEOUT_SECONDS) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                current = data.get("current_weather", {})
                return {
                    "temp": current.get("temperature"),
                    "windspeed": current.get("windspeed"),
                    "weathercode": current.get("weathercode"),
                    "time": current.get("time"),
                    "source": "Open-Meteo API",
                }
    except Exception as e:
        state = simulator.get_state()
        return {**state.weather, "source": "Simulator Mock (API Offline)", "error": str(e)}
    raise HTTPException(status_code=500, detail="Weather query failed")


@app.get("/api/geocode")
async def geocode(q: str = Query(..., description="Query location name to search")) -> Dict[str, Any]:
    """Queries OSM Nominatim service for geocoding coordinates lookup.

    Args:
        q: The text location query (e.g. 'MetLife Stadium').
    """
    url = f"https://nominatim.openstreetmap.org/search?q={q}&format=json&limit=1"
    headers = {"User-Agent": NOMINATIM_USER_AGENT}
    try:
        async with httpx.AsyncClient(timeout=HTTP_CLIENT_TIMEOUT_SECONDS) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                results = resp.json()
                if results:
                    loc = results[0]
                    return {
                        "name": loc.get("display_name"),
                        "lat": float(loc.get("lat")),
                        "lon": float(loc.get("lon")),
                        "type": loc.get("type"),
                        "source": "Nominatim OpenStreetMap",
                    }
                return {"message": "No locations found", "results": []}
            raise HTTPException(status_code=resp.status_code, detail="Nominatim API error")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to geocode query: {str(e)}") from e


class ChatRequest(BaseModel):
    """Pydantic schema validator for user chat queries."""

    message: str = Field(..., min_length=1, max_length=500, description="Chat query text")
    history: List[Dict[str, str]] = []
    accessibility_mode: bool = False
    language: str = "English"


@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest) -> Dict[str, Any]:
    """Exposes chat wayfinding, accessibility, and transit status.

    Args:
        req: ChatRequest object validation.
    """
    result = await orchestrator.chat(
        user_message=req.message,
        history=req.history,
        accessibility_mode=req.accessibility_mode,
        language=req.language,
    )
    return result


@app.get("/api/alerts")
async def get_alerts() -> List[Dict[str, Any]]:
    """Evaluates active simulator incidents, returning structured safety warnings."""
    return await orchestrator.evaluate_alerts()


@app.get("/api/sustainability/optimize")
async def optimize_sustainability() -> Dict[str, Any]:
    """Provides GenAI operational recommendations to optimize energy, waste, and water usage based on live stadium state."""
    state = simulator.get_state()
    prompt = f"""
    Analyze the current live stadium state to recommend 3 actionable sustainability optimizations (e.g., energy conservation in low-occupancy zones, escalator power saving, water pressure scaling, waste bin sorting staff allocation).

    Current Crowd Densities:
    {json.dumps(state.crowd_density)}

    Current Transit Congestion:
    {json.dumps(state.transit_status)}

    Current Weather:
    {json.dumps(state.weather)}

    Output a JSON object with a list key "optimizations" containing 3 items. Each item must have:
    - "area": the operational area (e.g., "Energy", "Waste", "Water")
    - "recommendation": the specific action recommended
    - "impact": expected eco-impact (e.g., "High", "Medium", "Low")
    """

    from google.genai import types

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        system_instruction="You are a green-operations GenAI advisor at MetLife Stadium. Optimize resource usage.",
    )

    def fallback() -> str:
        recommendations = [
            {
                "area": "Energy",
                "recommendation": "Activate eco-mode for escalators at lower-concourse zones since Gate B is congested.",
                "impact": "High",
            },
            {
                "area": "Waste",
                "recommendation": "Deploy mobile recycling team to Gate A and Concourse East to manage high density zones.",
                "impact": "Medium",
            },
            {
                "area": "Water",
                "recommendation": "Reduce seating bowl water pressure by 10% during active match play.",
                "impact": "Medium",
            },
        ]
        return json.dumps({"optimizations": recommendations})

    resp_str = await orchestrator._safe_generate(prompt, config, fallback)
    try:
        return json.loads(resp_str)  # type: ignore[no-any-return]
    except Exception:
        return json.loads(fallback())  # type: ignore[no-any-return]


@app.get("/api/transportation/recommend")
async def recommend_transportation() -> Dict[str, Any]:
    """Provides GenAI recommendations on departure mode and timing based on live congestion."""
    state = simulator.get_state()
    prompt = f"""
    Analyze the current transit congestion and wait times to recommend the best departure modes and timing.

    Current Transit Status:
    {json.dumps(state.transit_status)}

    Current Crowd Densities:
    {json.dumps(state.crowd_density)}

    Output a JSON object with:
    - "recommended_mode": the best transport mode (Train, Shuttle Bus, or Rideshare)
    - "reasoning": why this mode is suggested
    - "suggested_departure_window": description of when to leave (e.g. "Leave immediately", "Wait 30 minutes")
    """

    from google.genai import types

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        system_instruction="You are a transit intelligence GenAI advisor at MetLife Stadium. Optimize fan departures.",
    )

    def fallback() -> str:
        best_mode = "Shuttle Bus"
        min_wait = 999
        for mode, info in state.transit_status.items():
            if info["wait_time_mins"] < min_wait:
                min_wait = info["wait_time_mins"]
                best_mode = mode
        return json.dumps(
            {
                "recommended_mode": best_mode,
                "reasoning": f"Based on live data, {best_mode} has the lowest wait time of {min_wait} minutes.",
                "suggested_departure_window": "Depart within the next 15 minutes to beat the peak exit surge.",
            }
        )

    resp_str = await orchestrator._safe_generate(prompt, config, fallback)
    try:
        return json.loads(resp_str)  # type: ignore[no-any-return]
    except Exception:
        return json.loads(fallback())  # type: ignore[no-any-return]


class ExplainRequest(BaseModel):
    """Pydantic schema validator for alert explanation details."""

    alert: Dict[str, Any]
    language: str = "English"


@app.post("/api/explain-alert")
async def explain_alert_endpoint(req: ExplainRequest) -> Dict[str, Any]:
    """Generates simple explanation guidelines for volunteers on active alerts.

    Args:
        req: ExplainRequest parameters validator.
    """
    explanation = await orchestrator.explain_alert(req.alert, req.language)
    return {"explanation": explanation}


@app.get("/api/briefing/shift")
async def get_shift_briefing(
    language: str = Query("English", description="Target translation language"),
) -> Dict[str, str]:
    """Generates operations shift briefing logs summary using Gemini."""
    state = simulator.get_state()
    recent_incidents = [
        {
            "id": "inc_901",
            "type": "medical",
            "location": "Section 104",
            "severity": "Medium",
            "description": "Patron treated for dehydration. Resolved in 20 mins.",
            "status": "Resolved",
        },
        {
            "id": "inc_902",
            "type": "crowd",
            "location": "Gate A turnstiles",
            "severity": "High",
            "description": "Flow bottleneck at Gate A entry. Directed overflow to Gate B. Resolved.",
            "status": "Resolved",
        },
    ]
    all_incidents = recent_incidents + [inc.model_dump() for inc in state.incidents]

    briefing = await orchestrator.generate_shift_briefing(all_incidents, state.crowd_density, language)
    return {"briefing": briefing}


@app.get("/api/briefing/sustainability")
async def get_sustainability_briefing(
    language: str = Query("English", description="Target translation language"),
) -> Dict[str, str]:
    """Generates narrative green sustainability operations summary using Gemini."""
    metrics = {
        "waste_diverted_percentage": 82.4,
        "energy_consumption_kwh": 42100,
        "solar_contribution_kwh": 8400,
        "water_saved_gallons": 14200,
        "sustainability_score": "A-",
        "anomalies": "Slight waste build-up reported in Concourse East recycling bin #12",
    }
    report = await orchestrator.generate_sustainability_briefing(metrics, language)
    return {"report": report}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
