"""
Planning Agent
================
Based on the risk assessment from the Perception Agent, formulates an
action plan. Enhanced with multiple action types and LLM reasoning
when Gemini is available.
"""

import json
from loguru import logger
from ..config import settings


# Action types the planning agent can recommend
ACTION_TYPES = {
    "MONITOR": "Continue passive monitoring, no intervention needed.",
    "DISPATCH_RESOURCES": "Deploy additional vendors/supplies to the affected zone.",
    "REROUTE_CROWD": "Redirect crowd flow through alternative gates or corridors.",
    "ALERT_SECURITY": "Dispatch security personnel to manage the situation.",
    "EVACUATE_ZONE": "Begin controlled evacuation of the affected zone.",
}


class PlanningAgent:
    """
    Planning Agent
    Role: Based on risk assessment, decide if intervention is needed
    and what resources/actions are required.
    """

    async def plan(self, event_data: dict, risk_assessment: dict) -> dict:
        logger.info("PlanningAgent formulating plan")

        risk = risk_assessment.get("risk_level", "LOW")
        probability = risk_assessment.get("probability", 0)
        event_type = event_data.get("event_type", "unknown")
        predicted_people = event_data.get("predicted_people", 0)

        # Determine action based on risk level and event type
        if risk == "CRITICAL":
            if event_type in ["crowd_surge", "security_alert"]:
                action = "EVACUATE_ZONE"
                priority = "P0"
            else:
                action = "ALERT_SECURITY"
                priority = "P0"
            water_needed = int(predicted_people * 0.15)
            food_needed = int(predicted_people * 0.08)

        elif risk == "HIGH":
            if event_type == "congestion":
                action = "REROUTE_CROWD"
                priority = "P1"
            else:
                action = "DISPATCH_RESOURCES"
                priority = "P1"
            water_needed = int(predicted_people * 0.10)
            food_needed = int(predicted_people * 0.05)

        elif risk == "MEDIUM":
            action = "DISPATCH_RESOURCES"
            priority = "P2"
            water_needed = int(predicted_people * 0.05)
            food_needed = int(predicted_people * 0.03)

        else:
            action = "MONITOR"
            priority = "P3"
            water_needed = 0
            food_needed = 0

        reasoning = (
            f"Risk level is {risk} (probability: {probability:.1%}). "
            f"Event type '{event_type}' with ~{predicted_people} predicted people. "
            f"Action: {ACTION_TYPES.get(action, action)}"
        )

        return {
            "action": action,
            "priority": priority,
            "resources_required": {
                "water": water_needed,
                "food": food_needed,
            },
            "reasoning": reasoning,
        }
