"""
Planning Agent
================
The reasoning core of ArenaPulse. Given the perception risk assessment and the
live situation, it decides the intervention: which action, what priority, and
how many resources.

Primary path: **Gemini 3** reasons over the structured situation and returns a
plan. Fallback path: a deterministic risk/event lookup (used when Gemini is not
configured or a call fails), preserving the zero-external-deps property.
"""

from loguru import logger

from ..llm import gemini
from . import adk_agent


# Action types the planning agent can recommend
ACTION_TYPES = {
    "MONITOR": "Continue passive monitoring, no intervention needed.",
    "DISPATCH_RESOURCES": "Deploy additional vendors/supplies to the affected zone.",
    "REROUTE_CROWD": "Redirect crowd flow through alternative gates or corridors.",
    "ALERT_SECURITY": "Dispatch security personnel to manage the situation.",
    "EVACUATE_ZONE": "Begin controlled evacuation of the affected zone.",
}

_PLAN_SCHEMA = {
    "type": "object",
    "properties": {
        "action": {"type": "string", "enum": list(ACTION_TYPES.keys())},
        "priority": {"type": "string", "enum": ["P0", "P1", "P2", "P3"]},
        "resources_required": {
            "type": "object",
            "properties": {
                "water": {"type": "integer"},
                "food": {"type": "integer"},
            },
            "required": ["water", "food"],
        },
        "reasoning": {"type": "string"},
    },
    "required": ["action", "priority", "resources_required", "reasoning"],
}

_SYSTEM_INSTRUCTION = (
    "You are the Planning Agent for ArenaPulse, an autonomous logistics system "
    "coordinating crowd safety and vendor supply at a FIFA World Cup 2026 stadium. "
    "Given a perceived risk assessment and live event telemetry, decide the single "
    "best intervention. Be decisive and operationally specific. Prefer MONITOR only "
    "when risk is genuinely low. Reserve EVACUATE_ZONE for CRITICAL life-safety "
    "situations. Size water/food quantities to the predicted crowd. Respond ONLY "
    "with the structured plan."
)


class PlanningAgent:
    """
    Planning Agent
    Role: Decide if intervention is needed and what resources/actions are required.
    """

    async def plan(self, event_data: dict, risk_assessment: dict) -> dict:
        logger.info("PlanningAgent formulating plan")

        # 1. Preferred path: the ADK agent (Gemini 3 + Elastic vendor tool).
        adk_plan = await adk_agent.plan_via_adk(event_data, risk_assessment)
        if adk_plan is not None:
            adk_plan["planner"] = "adk"
            return adk_plan

        # 2. Direct Gemini JSON (ADK disabled/unavailable but Gemini configured).
        llm_plan = await self._gemini_plan(event_data, risk_assessment)
        if llm_plan is not None:
            llm_plan["planner"] = "gemini"
            return llm_plan

        # 3. Deterministic heuristic — always available.
        plan = self._heuristic_plan(event_data, risk_assessment)
        plan["planner"] = "heuristic"
        return plan

    async def _gemini_plan(self, event_data: dict, risk_assessment: dict):
        """Ask Gemini 3 to decide the plan. Returns None if unavailable/failed."""
        if not gemini.is_available():
            return None

        risk = risk_assessment.get("risk_level", "LOW")
        probability = risk_assessment.get("probability", 0)
        prompt = (
            "Decide the intervention plan.\n\n"
            f"Risk level: {risk}\n"
            f"Surge probability: {probability:.1%}\n"
            f"Perception note: {risk_assessment.get('assessment', 'n/a')}\n"
            f"Event type: {event_data.get('event_type', 'unknown')}\n"
            f"Location: {event_data.get('location', 'unknown')}\n"
            f"Density score (0-10): {event_data.get('density_score', 'n/a')}\n"
            f"Predicted people in zone: {event_data.get('predicted_people', 'n/a')}\n\n"
            "Available actions: " + ", ".join(ACTION_TYPES.keys()) + ".\n"
            "Return action, priority (P0 highest), resources_required.water, "
            "resources_required.food, and a concise operational reasoning."
        )

        result = await gemini.generate_json(
            prompt, schema=_PLAN_SCHEMA, system_instruction=_SYSTEM_INSTRUCTION
        )
        if not result:
            return None

        # Defensive normalization — never trust the model to be perfectly shaped.
        action = result.get("action")
        if action not in ACTION_TYPES:
            return None
        resources = result.get("resources_required", {}) or {}
        return {
            "action": action,
            "priority": result.get("priority", "P2"),
            "resources_required": {
                "water": max(0, int(resources.get("water", 0) or 0)),
                "food": max(0, int(resources.get("food", 0) or 0)),
            },
            "reasoning": result.get("reasoning", ACTION_TYPES.get(action, action)),
        }

    def _heuristic_plan(self, event_data: dict, risk_assessment: dict) -> dict:
        """Deterministic fallback when Gemini is unavailable."""
        risk = risk_assessment.get("risk_level", "LOW")
        probability = risk_assessment.get("probability", 0)
        event_type = event_data.get("event_type", "unknown")
        predicted_people = event_data.get("predicted_people", 0)

        if risk == "CRITICAL":
            action = "EVACUATE_ZONE" if event_type in ["crowd_surge", "security_alert"] else "ALERT_SECURITY"
            priority = "P0"
            water_needed = int(predicted_people * 0.15)
            food_needed = int(predicted_people * 0.08)
        elif risk == "HIGH":
            action = "REROUTE_CROWD" if event_type == "congestion" else "DISPATCH_RESOURCES"
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
            "resources_required": {"water": water_needed, "food": food_needed},
            "reasoning": reasoning,
        }
