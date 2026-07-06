"""Stadium Operations GenAI Orchestrator.

This module coordinates chat wayfinding, accessibility routing, staff safety plan
evaluations, and volunteer briefings using Gemini 2.5 Flash.
"""

import json
from typing import Any, Callable, Dict, List

from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

from backend.generator import simulator

load_dotenv()


def get_crowd_density(zone: str) -> str:
    """Gets the current crowd density percentage and status for a zone.

    Args:
        zone: Name of zone (e.g. 'Gate A', 'Gate B', 'Seating Bowl').

    Returns:
        JSON string representing current density percentage and classification status.
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

    return json.dumps({"zone": matched_zone, "density_percentage": density, "status": status})


def get_route(start: str, destination: str, accessibility_mode: bool = False) -> str:
    """Gets navigation directions between two coordinates within MetLife Stadium.

    Args:
        start: Starting point (e.g. Gate A).
        destination: Target location (e.g. Seating Bowl).
        accessibility_mode: True if fan requires step-free / wheelchair routes.

    Returns:
        JSON string with route details and instructions list.
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
            f"The {dest_clean} is located on your right, fully step-free.",
        ]
    else:
        instructions = [
            f"Depart from {start_clean}.",
            "Proceed up the central escalator to Level 2 Concourse.",
            "Turn right and walk past the concessions.",
            f"The {dest_clean} is located directly ahead.",
        ]

    return json.dumps(
        {"route_type": mode_text, "start": start_clean, "destination": dest_clean, "instructions": instructions}
    )


def get_transit_status(route_or_station: str) -> str:
    """Gets wait times and transit delays for NY Transit trains, shuttle buses, or rideshares.

    Args:
        route_or_station: The mode of transport (e.g. 'Train', 'Shuttle Bus').

    Returns:
        JSON string representing wait times and congestion levels.
    """
    mode_clean = "Train"
    input_clean = route_or_station.lower()
    if "shuttle" in input_clean or "bus" in input_clean:
        mode_clean = "Shuttle Bus"
    elif "rideshare" in input_clean or "uber" in input_clean or "lyft" in input_clean:
        mode_clean = "Rideshare"

    state = simulator.get_state()
    info = state.transit_status.get(mode_clean, {"congestion": "Medium", "wait_time_mins": 10})

    return json.dumps({
        "mode": mode_clean,
        "congestion_level": info["congestion"],
        "wait_time_minutes": info["wait_time_mins"],
    })


# Map string name to function reference
TOOLS_MAP: Dict[str, Callable[..., str]] = {
    "get_crowd_density": get_crowd_density,
    "get_route": get_route,
    "get_transit_status": get_transit_status,
}

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
    """Pydantic schema representing evaluated safety plan instructions for staff copilot feed."""

    incident_id: str = Field(description="The incident ID from the simulation")
    title: str = Field(description="Actionable title for the alert")
    severity: str = Field(description="Severity (e.g. Low, Medium, High, Critical)")
    crowd_density: str = Field(description="Crowd density percentage in the area")
    recommended_actions: List[str] = Field(description="List of 3-4 specific instructions for staff")
    confidence_score: int = Field(description="Confidence percentage (0-100) based on data quality")
    rationale: str = Field(description="Explanation of why these actions were suggested")


class GeminiOrchestrator:
    """Manages model client parameters, alerts caches, and tool loops."""

    def __init__(self) -> None:
        """Initializes Gemini model and local alerts caches."""
        self.client: genai.Client = genai.Client()
        self.model: str = "gemini-2.5-flash"
        self.alerts_cache: Dict[str, Dict[str, Any]] = {}

    async def chat(
        self, user_message: str, history: List[Dict[str, str]] | None = None, accessibility_mode: bool = False
    ) -> Dict[str, Any]:
        """Processes a chat query, executing tools if requested by the model.

        Args:
            user_message: Chat message text.
            history: List of past queries and responses.
            accessibility_mode: Explicit force flag for step-free routes.

        Returns:
            Dictionary with response text and tools called details.
        """
        contents = []
        if history:
            for msg in history:
                role = msg.get("role", "user")
                text = msg.get("text", "")
                contents.append(types.Content(role=role, parts=[types.Part.from_text(text=text)]))

        full_message = user_message
        if accessibility_mode:
            full_message += " (Ensure accessibility mode / step-free navigation instructions are used)."

        contents.append(types.Content(role="user", parts=[types.Part.from_text(text=full_message)]))

        tools_called = []
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=contents,
                config=types.GenerateContentConfig(
                    tools=[get_crowd_density, get_route, get_transit_status],
                    system_instruction=SYSTEM_INSTRUCTION,
                    automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
                ),
            )

            iterations = 0
            while response.function_calls and iterations < 5:
                iterations += 1
                model_parts = []
                for fc in response.function_calls:
                    model_parts.append(types.Part.from_function_call(name=fc.name or "", args=fc.args or {}))
                contents.append(types.Content(role="model", parts=model_parts))

                tool_response_parts = []
                for fc in response.function_calls:
                    tool_name = fc.name or ""
                    tool_args = fc.args or {}
                    tools_called.append({"name": tool_name, "args": dict(tool_args)})

                    if tool_name in TOOLS_MAP:
                        func = TOOLS_MAP[tool_name]
                        try:
                            func_args = dict(tool_args.items())
                            if tool_name == "get_route" and accessibility_mode:
                                func_args["accessibility_mode"] = True
                            result_str = func(**func_args)
                        except Exception as e:
                            result_str = json.dumps({"error": f"Failed executing tool {tool_name}: {str(e)}"})
                    else:
                        result_str = json.dumps({"error": f"Tool {tool_name} not found"})

                    tool_response_parts.append(
                        types.Part.from_function_response(name=tool_name, response={"result": result_str})
                    )

                contents.append(types.Content(role="tool", parts=tool_response_parts))

                response = self.client.models.generate_content(
                    model=self.model,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        tools=[get_crowd_density, get_route, get_transit_status],
                        system_instruction=SYSTEM_INSTRUCTION,
                        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
                    ),
                )

            final_text = response.text or "I apologize, I could not formulate a response."
            return {"response": final_text, "tools_called": tools_called}

        except Exception as e:
            return {"response": f"Orchestrator error occurred: {str(e)}", "tools_called": tools_called, "error": True}

    async def evaluate_alerts(self) -> List[Dict[str, Any]]:
        """Evaluates active incidents, generating safety alerts using model schemas.

        Returns:
            List of evaluated alert dictionary items.
        """
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
                        system_instruction="You are a senior safety director at MetLife Stadium. Return a structured safety response for volunteers.",
                    ),
                )

                resp_text = response.text or "{}"
                alert_data = json.loads(resp_text)
                alert_data["incident_id"] = incident.id
                self.alerts_cache[incident.id] = alert_data
                evaluated_alerts.append(alert_data)
            except Exception as e:
                # Fallback details under rate limit warnings
                fallback = {
                    "incident_id": incident.id,
                    "title": f"INCIDENT DETECTED: {incident.location}",
                    "severity": incident.severity,
                    "crowd_density": f"{state.crowd_density.get(incident.location, 80)}%",
                    "recommended_actions": [
                        "Investigate the area immediately.",
                        "Direct fans away from congestion zones.",
                        "Coordinate with local supervisors.",
                    ],
                    "confidence_score": 75,
                    "rationale": f"Fallback alert created due to connection issue: {str(e)}",
                }
                evaluated_alerts.append(fallback)

        return evaluated_alerts

    async def explain_alert(self, alert_data: Dict[str, Any], language: str = "English") -> str:
        """Explains alert instructions in volunteer-friendly vocabulary.

        Args:
            alert_data: The alert model dict.
            language: The target output translation language.

        Returns:
            Friendly text instructions.
        """
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
                ),
            )
            return response.text or "Follow the listed recommended actions and stay safe."
        except Exception as e:
            return f"Simplify guidelines: 1. Head to {alert_data.get('title')}. 2. Direct crowd flow. 3. Help fans. (Error: {str(e)})"


# Global orchestrator instance
orchestrator = GeminiOrchestrator()
