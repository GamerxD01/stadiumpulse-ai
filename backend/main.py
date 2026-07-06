import os
import json
import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from google.genai import types
from backend.generator import simulator
from backend.orchestrator import orchestrator

load_dotenv()

app = FastAPI(title="StadiumPulse AI Backend")

# Enable CORS for local React development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load configuration from environment
NOMINATIM_USER_AGENT = os.getenv("NOMINATIM_USER_AGENT", "StadiumPulseAI/1.0")
OPEN_METEO_BASE_URL = os.getenv("OPEN_METEO_BASE_URL", "https://api.open-meteo.com/v1")

class SpikeRequest(BaseModel):
    spike_type: str  # crowd, medical, transit, clear

@app.get("/")
def read_root():
    return {"message": "StadiumPulse AI API is live! Access endpoints under /api/*"}

@app.get("/api/status")
def get_status():
    """Get the current live status of stadium sensors, transit, and active incidents."""
    return simulator.get_state()

@app.post("/api/trigger-spike")
def trigger_spike(req: SpikeRequest):
    """Trigger a mock sensor spike or incident scenario."""
    valid_types = ["crowd", "medical", "transit", "clear"]
    if req.spike_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid spike_type. Must be one of {valid_types}")
    simulator.trigger_spike(req.spike_type)
    return {"message": f"Spike '{req.spike_type}' successfully triggered.", "state": simulator.get_state()}

@app.get("/api/weather")
async def get_weather(lat: float = 40.8135, lon: float = -74.0744):
    """
    Fetch live weather details from Open-Meteo for the venue coordinates.
    Defaults to MetLife Stadium coordinates (lat: 40.8135, lon: -74.0744).
    """
    url = f"{OPEN_METEO_BASE_URL}/forecast?latitude={lat}&longitude={lon}&current_weather=true"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                current = data.get("current_weather", {})
                return {
                    "temp": current.get("temperature"),
                    "windspeed": current.get("windspeed"),
                    "weathercode": current.get("weathercode"),
                    "time": current.get("time"),
                    "source": "Open-Meteo API"
                }
    except Exception as e:
        # Fallback to mock weather in simulator if external API fails
        state = simulator.get_state()
        return {
            **state.weather,
            "source": "Simulator Mock (API Offline)",
            "error": str(e)
        }

@app.get("/api/geocode")
async def geocode(q: str = Query(..., description="Query location name to search")):
    """
    Query OpenStreetMap's Nominatim service for geocoding / venue location lookup.
    """
    url = f"https://nominatim.openstreetmap.org/search?q={q}&format=json&limit=1"
    headers = {"User-Agent": NOMINATIM_USER_AGENT}
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
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
                        "source": "Nominatim OpenStreetMap"
                    }
                return {"message": "No locations found", "results": []}
            else:
                raise HTTPException(status_code=resp.status_code, detail="Nominatim API error")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to geocode query: {str(e)}")

# Placeholder chat endpoint (will be wired to Gemini orchestrator in Step 2)
class ChatRequest(BaseModel):
    message: str
    history: list = []
    accessibility_mode: bool = False

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    """Orchestrated Chat endpoint for Fan Companion and other clients."""
    result = await orchestrator.chat(
        user_message=req.message,
        history=req.history,
        accessibility_mode=req.accessibility_mode
    )
    return result

@app.get("/api/alerts")
async def get_alerts():
    """Retrieve and evaluate safety alerts for active incidents."""
    return await orchestrator.evaluate_alerts()

class ExplainRequest(BaseModel):
    alert: dict
    language: str = "English"

@app.post("/api/explain-alert")
async def explain_alert_endpoint(req: ExplainRequest):
    """Generate a friendly explanation of the alert details for a volunteer."""
    explanation = await orchestrator.explain_alert(req.alert, req.language)
    return {"explanation": explanation}

@app.get("/api/briefing/shift")
async def get_shift_briefing():
    """Generate a shift briefing summary using Gemini based on current active/resolved incidents."""
    state = simulator.get_state()
    # Mock some recent resolved incidents to make the summary interesting
    recent_incidents = [
        {"id": "inc_901", "type": "medical", "location": "Section 104", "severity": "Medium", "description": "Patron treated for dehydration. Resolved in 20 mins.", "status": "Resolved"},
        {"id": "inc_902", "type": "crowd", "location": "Gate A turnstiles", "severity": "High", "description": "Flow bottleneck at Gate A entry. Directed overflow to Gate B. Resolved.", "status": "Resolved"}
    ]
    # Merge with active incidents
    all_incidents = recent_incidents + [inc.model_dump() for inc in state.incidents]
    
    prompt = f"""
    You are the Stadium Operations Director. Based on the following incident registry from the last 4 hours, generate a concise 3-bullet point operations briefing for the upcoming shift change. Highlight key alerts, actions taken, and outstanding issues.
    
    Incidents Registry:
    {json.dumps(all_incidents)}
    
    Current Stadium Densities:
    {json.dumps(state.crowd_density)}
    """
    try:
        # Avoid rate limits by generating directly using client
        response = orchestrator.client.models.generate_content(
            model=orchestrator.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction="You are a stadium ops chief. Output exactly 3 high-impact, professional bullet points."
            )
        )
        return {"briefing": response.text or "All clear. Normal operations active."}
    except Exception as e:
        return {"briefing": f"• Operations Stable: Normal stadium flow.\n• No major incidents reported in last 4 hours.\n• Shift transition in progress. (Error generating: {str(e)})"}

@app.get("/api/briefing/sustainability")
async def get_sustainability_briefing():
    """Generate a sustainability summary using Gemini based on stadium metrics."""
    metrics = {
        "waste_diverted_percentage": 82.4,
        "energy_consumption_kwh": 42100,
        "solar_contribution_kwh": 8400,
        "water_saved_gallons": 14200,
        "sustainability_score": "A-",
        "anomalies": "Slight waste build-up reported in Concourse East recycling bin #12"
    }
    
    prompt = f"""
    Draft a professional, narrative sustainability summary for the post-match report.
    Use these raw metrics to draft the report:
    {json.dumps(metrics)}
    """
    try:
        response = orchestrator.client.models.generate_content(
            model=orchestrator.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction="You are a green-operations advisor. Summarize sustainability performance in 2 paragraphs, pointing out successes and any anomalies."
            )
        )
        return {"report": response.text or "Green metrics stable. MetLife Stadium operations within green limits."}
    except Exception as e:
        return {"report": f"MetLife Stadium operations successfully diverted 82.4% of waste, utilizing 8,400 kWh of solar energy. Water conservation saved 14,200 gallons. General grade: A-. (Error generating: {str(e)})"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
