import os
import json
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from typing import List
from google import genai
from google.genai import types
from backend.generator import simulator

load_dotenv()

# Helper tool functions
def get_crowd_density(zone: str) -> str:
    """
    Get the current crowd density percentage and safety level for a given zone or gate.
    
    Args:
        zone: Name of zone (e.g. 'Gate A', 'Gate B', 'Gate C', 'Gate D', 'Concourse East', 'Concourse West', 'Seating Bowl', 'Transit Hub').
    """
    zone_upper = zone.upper()
    matched_zone = None
    for z in simulator.zones:
        if z.upper() in zone_upper or zone_upper in z.upper():
            matched_zone = z
            break
    if not matched_zone:
        matched_zone = zone

    state = simulator.get_state()
    density = state.crowd_density.get(matched_zone, 40)
    
    status = "Low"
    if density >= 90:
        status = "Critical (Overcrowding alert)"
    elif density >= 75:
        status = "High (Moderate congestion)"
    elif density >= 50:
        status = "Medium"
        
    return json.dumps({
        "zone": matched_zone,
        "density_percentage": density,
        "status": status
    })

def get_route(start: str, destination: str, accessibility_mode: bool = False) -> str:
    """
    Get text navigation directions between two locations within MetLife Stadium.
    
    Args:
        start: Starting point (e.g. Gate A, Section 101, Concourse East).
        destination: Target location (e.g. Accessible Restroom, Gate B, Exit).
        accessibility_mode: Must set to True if fan requires step-free, elevator, ramp or wheelchair-friendly path.
    """
    mode_text = "Step-Free Accessible Route" if accessibility_mode else "Standard Express Route"
    start_clean = start.strip().title()
    dest_clean = destination.strip().title()
    
    if accessibility_mode:
        instructions = [
            f"Depart from {start_clean}.",
            "Follow the blue ADA signage to Elevator Bank North-West.",
            "Take Elevator 3 to Level 2 Concourse.",
            "Turn left upon exiting the elevator and follow the ramp downwards.",
            f"The {dest_clean} is located on your right, fully step-free."
        ]
    else:
        instructions = [
            f"Depart from {start_clean}.",
            "Proceed up the central escalator to Level 2 Concourse.",
            "Turn right and walk past the concessions.",
            f"The {dest_clean} is located directly ahead."
        ]
        
    return json.dumps({
        "route_type": mode_text,
        "start": start_clean,
        "destination": dest_clean,
        "instructions": instructions
    })

def get_transit_status(route_or_station: str) -> str:
    """
    Get the live congestion level and wait times for train, shuttle buses, or rideshare services.
    
    Args:
        route_or_station: The mode of transport (e.g. 'Train', 'Shuttle Bus', 'Rideshare').
    """
    mode_clean = "Train"
    input_clean = route_or_station.lower()
    if "shuttle" in input_clean or "bus" in input_clean:
        mode_clean = "Shuttle Bus"
    elif "rideshare" in input_clean or "uber" in input_clean or "lyft" in input_clean or "taxi" in input_clean:
        mode_clean = "Rideshare"
        
    state = simulator.get_state()
    info = state.transit_status.get(mode_clean, {"congestion": "Medium", "wait_time_mins": 10})
    
    return json.dumps({
        "mode": mode_clean,
        "congestion_level": info["congestion"],
        "wait_time_minutes": info["wait_time_mins"]
    })

# Map string name to function reference
TOOLS_MAP = {
    "get_crowd_density": get_crowd_density,
    "get_route": get_route,
    "get_transit_status": get_transit_status
}

# System prompt
SYSTEM_INSTRUCTION = """
You are the StadiumPulse AI Orchestrator, the central GenAI operating system for FIFA World Cup 2026 stadiums (MetLife Stadium, East Rutherford).
Your intelligence powers:
1. The Fan Companion Chat: Providing navigational, accessibility, and transit guidance.
2. The Staff/Volunteer Copilot: Recommending response plans, confidence scores, and plain-English action items.
3. The Organizer Command Center: Drafted summaries of shifts and sustainability indexes.

CRITICAL INSTRUCTIONS:
- Multilingual Detection: Auto-detect the user's language (Spanish, Portuguese, Arabic, French, German, Hindi, Japanese, Korean, Mandarin, etc.). You must respond natively in that exact language.
- Tool Calling: You have access to three real-time tools: get_crowd_density, get_route, and get_transit_status. Use them to provide accurate live answers. Do NOT hallucinate density values or wait times. Always query the tool.
- Accessibility: If the fan queries wheelchair access, step-free routes, elevators, low-sensory zones, or has difficulty climbing stairs, you MUST invoke get_route with accessibility_mode=True.
- Personality: Helpful, professional, clear, and tournament-focused.
"""

class StaffAlertModel(BaseModel):
    incident_id: str = Field(description="The incident ID from the simulation")
    title: str = Field(description="Actionable title for the alert")
    severity: str = Field(description="Severity (e.g. Low, Medium, High, Critical)")
    crowd_density: str = Field(description="Crowd density percentage in the area")
    recommended_actions: List[str] = Field(description="List of 3-4 specific instructions for staff")
    confidence_score: int = Field(description="Confidence percentage (0-100) based on data quality")
    rationale: str = Field(description="Explanation of why these actions were suggested")

class GeminiOrchestrator:
    def __init__(self):
        # The client automatically picks up GEMINI_API_KEY from environment
        self.client = genai.Client()
        self.model = "gemini-2.5-flash"
        self.alerts_cache = {}

    async def chat(self, user_message: str, history: list = None, accessibility_mode: bool = False) -> dict:
        """
        Processes a chat message through the Gemini model, resolving any function/tool calling.
        
        Args:
            user_message: The text query from the user.
            history: List of past messages in the chat session, e.g. [{"role": "user"|"model", "text": "..."}]
            accessibility_mode: Explicit flag if the frontend wants accessibility forced.
        """
        # Convert history list into types.Content objects
        contents = []
        if history:
            for msg in history:
                role = msg.get("role", "user")
                text = msg.get("text", "")
                contents.append(types.Content(role=role, parts=[types.Part.from_text(text=text)]))
        
        # If user explicitly checked accessibility mode, append a hint to message
        full_message = user_message
        if accessibility_mode:
            full_message += " (Ensure accessibility mode / step-free navigation instructions are used)."

        # Append new user message
        contents.append(types.Content(role="user", parts=[types.Part.from_text(text=full_message)]))

        tools_called = []
        try:
            # First turn: Gemini decides whether to call a tool or reply directly
            response = self.client.models.generate_content(
                model=self.model,
                contents=contents,
                config=types.GenerateContentConfig(
                    tools=[get_crowd_density, get_route, get_transit_status],
                    system_instruction=SYSTEM_INSTRUCTION,
                    automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True)
                )
            )

            # Execution loop to resolve tool calls (max 5 iterations to prevent infinite loops)
            iterations = 0
            while response.function_calls and iterations < 5:
                iterations += 1
                
                # We need to track the model's call in the conversation history
                # Ensure the model's message contains the function calls so Gemini remembers making them
                model_parts = []
                for fc in response.function_calls:
                    model_parts.append(types.Part.from_function_call(
                        name=fc.name,
                        args=fc.args
                    ))
                contents.append(types.Content(role="model", parts=model_parts))

                tool_response_parts = []
                for fc in response.function_calls:
                    tool_name = fc.name
                    tool_args = fc.args
                    tools_called.append({"name": tool_name, "args": dict(tool_args)})

                    # Run target tool
                    if tool_name in TOOLS_MAP:
                        func = TOOLS_MAP[tool_name]
                        # Handle arg mapping (Pydantic models / dicts keys map)
                        try:
                            # Standard args unpacking
                            func_args = {k: v for k, v in tool_args.items()}
                            # If get_route, pass accessibility_mode logic
                            if tool_name == "get_route" and accessibility_mode:
                                func_args["accessibility_mode"] = True
                            
                            result_str = func(**func_args)
                        except Exception as e:
                            result_str = json.dumps({"error": f"Failed executing tool {tool_name}: {str(e)}"})
                    else:
                        result_str = json.dumps({"error": f"Tool {tool_name} not found"})

                    # Add response part
                    tool_response_parts.append(types.Part.from_function_response(
                        name=tool_name,
                        response={"result": result_str}
                    ))
                
                # Add tool responses as a single content turn
                contents.append(types.Content(role="tool", parts=tool_response_parts))

                # Query Gemini again with the tool responses added
                response = self.client.models.generate_content(
                    model=self.model,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        tools=[get_crowd_density, get_route, get_transit_status],
                        system_instruction=SYSTEM_INSTRUCTION,
                        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True)
                    )
                )

            # Extract final text
            final_text = response.text or "I apologize, I could not formulate a response."
            
            # Simple language detection logic based on response or query if needed,
            # but Gemini does this automatically. Let's return details.
            return {
                "response": final_text,
                "tools_called": tools_called
            }

        except Exception as e:
            return {
                "response": f"Orchestrator error occurred: {str(e)}",
                "tools_called": tools_called,
                "error": True
            }

    async def evaluate_alerts(self) -> list:
        state = simulator.get_state()
        active_incidents = [inc for inc in state.incidents if inc.status == "Active"]
        
        # Clear cache of resolved incidents
        active_ids = {inc.id for inc in active_incidents}
        self.alerts_cache = {k: v for k, v in self.alerts_cache.items() if k in active_ids}
        
        evaluated_alerts = []
        for incident in active_incidents:
            if incident.id in self.alerts_cache:
                evaluated_alerts.append(self.alerts_cache[incident.id])
                continue
                
            # If not in cache, call Gemini to generate safety alert
            prompt = f"""
            Analyze the following stadium incident and current crowd state:
            Incident details:
            - Type: {incident.type}
            - Location: {incident.location}
            - Severity: {incident.severity}
            - Description: {incident.description}
            
            Current Crowd Densities:
            {json.dumps(state.crowd_density)}
            
            Current Transit Congestion:
            {json.dumps(state.transit_status)}
            
            Generate a safety plan for staff and volunteers on the ground.
            """
            
            try:
                response = self.client.models.generate_content(
                    model=self.model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=StaffAlertModel,
                        system_instruction="You are a senior safety director at MetLife Stadium. Return a structured safety response for volunteers."
                    )
                )
                
                alert_data = json.loads(response.text)
                # Ensure the incident_id is set correctly
                alert_data["incident_id"] = incident.id
                
                self.alerts_cache[incident.id] = alert_data
                evaluated_alerts.append(alert_data)
            except Exception as e:
                # Fallback alert in case of API failure / rate limits
                fallback = {
                    "incident_id": incident.id,
                    "title": f"INCIDENT DETECTED: {incident.location}",
                    "severity": incident.severity,
                    "crowd_density": f"{state.crowd_density.get(incident.location, 80)}%",
                    "recommended_actions": [
                        "Investigate the area immediately.",
                        "Direct fans away from congestion zones.",
                        "Coordinate with local supervisors."
                    ],
                    "confidence_score": 75,
                    "rationale": f"Fallback alert created due to connection issue: {str(e)}"
                }
                evaluated_alerts.append(fallback)
                
        return evaluated_alerts

    async def explain_alert(self, alert_data: dict, language: str = "English") -> str:
        prompt = f"""
        Explain this staff alert to a brand-new volunteer. Remove complex operational jargon, make it friendly and plain-English (or translate to the target language).
        
        Alert Data:
        {json.dumps(alert_data)}
        
        Target Language: {language}
        """
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction="You are a friendly volunteer supervisor. Translate the alert into simple terms."
                )
            )
            return response.text or "Follow the listed recommended actions and stay safe."
        except Exception as e:
            return f"Simplify guidelines: 1. Head to {alert_data.get('title')}. 2. Direct crowd flow. 3. Help fans. (Error: {str(e)})"

# Global orchestrator instance
orchestrator = GeminiOrchestrator()
