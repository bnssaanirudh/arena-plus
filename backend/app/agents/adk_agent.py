"""
ArenaPulse ADK agent (Google Cloud Agent Builder)
==================================================
Re-expresses the planning *brain* as a real Agent Development Kit (ADK)
``LlmAgent`` driven by Gemini 3, with the Elastic vendor-search exposed as a
tool the model can call autonomously. This is the convergence point of the
three hackathon pillars:

    Gemini 3 (reasoning model)  +  ADK (Agent Builder framework)  +  Elastic MCP
    (the ``find_nearby_vendors`` tool call) — all in one decision.

It is **optional and import-guarded**. The agent is only built when:
  - ``settings.USE_ADK`` is true, AND
  - ``google-adk`` is importable, AND
  - Gemini is configured (``gemini.is_available()``).

Otherwise ``plan_via_adk()`` returns ``None`` and the PlanningAgent falls back
to direct Gemini JSON and then its deterministic heuristic — preserving the
zero-external-deps boot property. Nothing here runs at import time.
"""

import json
import re
import uuid
from typing import Any, Dict, List, Optional

from loguru import logger

from ..config import settings
from ..llm import gemini
from ..mcp.tools import MCPTools

# Cached, lazily-built singletons
_import_ok: Optional[bool] = None
_agent = None
_runner = None
_session_service = None

_APP_NAME = "arenapulse"
_USER_ID = "arena-coordinator"

_INSTRUCTION = (
    "You are the ArenaPulse Coordinator, an autonomous logistics agent managing "
    "crowd safety and vendor supply at a FIFA World Cup 2026 stadium.\n\n"
    "Given a perceived risk assessment and live telemetry for a zone, decide the "
    "single best intervention. When an intervention may need supplies dispatched, "
    "FIRST call the `find_nearby_vendors` tool to see which vendors are near the "
    "affected zone and what stock they hold, then size your resource request to "
    "reality. Be decisive and operationally specific. Use MONITOR only when risk is "
    "genuinely low; reserve EVACUATE_ZONE for CRITICAL life-safety situations.\n\n"
    "Allowed actions: MONITOR, DISPATCH_RESOURCES, REROUTE_CROWD, ALERT_SECURITY, "
    "EVACUATE_ZONE. Priorities: P0 (highest) .. P3.\n\n"
    "Your FINAL message MUST be ONLY a JSON object (no prose, no code fences) of the "
    'form: {"action": <action>, "priority": <P0..P3>, '
    '"resources_required": {"water": <int>, "food": <int>}, '
    '"reasoning": <short operational justification, mention any vendor evidence>}.'
)


async def find_nearby_vendors(
    latitude: float, longitude: float, radius_meters: int = 1000
) -> List[Dict[str, Any]]:
    """Find food/water/merch vendors near a stadium location.

    Backed by an Elastic ``geo_distance`` search over the vendor index (falls
    back to an in-memory geo-filter when Elastic is unavailable). Use this to
    learn which vendors are close to a surge zone and how much stock they have
    before deciding how many resources to dispatch.

    Args:
        latitude: Latitude of the affected zone.
        longitude: Longitude of the affected zone.
        radius_meters: Search radius in metres (default 1000).

    Returns:
        A list of vendor records (id, name, location, inventory levels).
    """
    distance = f"{int(radius_meters)}m"
    vendors = await MCPTools.find_nearest_vendor(latitude, longitude, distance)
    logger.info(f"[ADK tool] find_nearby_vendors -> {len(vendors)} vendor(s) within {distance}")
    return vendors


def _try_imports() -> bool:
    """True if google-adk can be imported. Cached; never raises."""
    global _import_ok
    if _import_ok is not None:
        return _import_ok
    try:
        import google.adk  # noqa: F401

        _import_ok = True
    except Exception as e:  # pragma: no cover - depends on optional dep
        logger.info(f"google-adk not available — ADK planning disabled ({e})")
        _import_ok = False
    return _import_ok


def adk_available() -> bool:
    """Gate: ADK planning is usable only with the flag, the SDK, and Gemini creds."""
    return settings.USE_ADK and _try_imports() and gemini.is_available()


def _get_runner():
    """Lazily build the ADK agent + runner. Returns (runner, session_service) or None."""
    global _agent, _runner, _session_service
    if _runner is not None:
        return _runner, _session_service
    try:
        from google.adk.agents import LlmAgent
        from google.adk.runners import Runner
        from google.adk.sessions import InMemorySessionService
        from google.adk.tools import FunctionTool

        _agent = LlmAgent(
            name="arenapulse_coordinator",
            model=settings.GEMINI_MODEL,
            description="Autonomous crowd-safety & vendor-supply coordinator for ArenaPulse.",
            instruction=_INSTRUCTION,
            tools=[FunctionTool(find_nearby_vendors)],
        )
        _session_service = InMemorySessionService()
        _runner = Runner(
            app_name=_APP_NAME,
            agent=_agent,
            session_service=_session_service,
        )
        logger.info(f"ADK agent ready (model={settings.GEMINI_MODEL}, tools=[find_nearby_vendors])")
        return _runner, _session_service
    except Exception as e:  # pragma: no cover - depends on external SDK/creds
        logger.warning(f"Failed to build ADK agent/runner: {e}")
        return None, None


def _extract_json(text: str) -> Optional[Dict[str, Any]]:
    """Pull the first JSON object out of the model's final message."""
    if not text:
        return None
    text = text.strip()
    # Strip markdown code fences if the model added them despite instructions.
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fence:
        text = fence.group(1)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                return None
    return None


def _build_prompt(event_data: dict, risk_assessment: dict) -> str:
    prompt = (
        "Decide the intervention plan for this situation.\n\n"
        f"Risk level: {risk_assessment.get('risk_level', 'LOW')}\n"
        f"Surge probability: {risk_assessment.get('probability', 0):.1%}\n"
        f"Perception note: {risk_assessment.get('assessment', 'n/a')}\n"
        f"Event type: {event_data.get('event_type', 'unknown')}\n"
        f"Location/zone: {event_data.get('location', 'unknown')}\n"
        f"Latitude: {event_data.get('latitude', 'n/a')}\n"
        f"Longitude: {event_data.get('longitude', 'n/a')}\n"
        f"Density score (0-10): {event_data.get('density_score', 'n/a')}\n"
        f"Predicted people in zone: {event_data.get('predicted_people', 'n/a')}\n"
    )
    if event_data.get("_past_decisions"):
        prompt += f"\n{event_data['_past_decisions']}\n"
    if event_data.get("_constraint_correction"):
        prompt += (
            "\nIMPORTANT — your previous plan was infeasible. Apply this "
            f"correction when re-planning: {event_data['_constraint_correction']}\n"
        )
    return prompt


async def plan_via_adk(event_data: dict, risk_assessment: dict) -> Optional[Dict[str, Any]]:
    """Run the planning decision through the ADK agent.

    Returns a normalized plan dict (without the ``planner`` tag) or ``None`` so
    the caller can fall back to direct Gemini / heuristic planning.
    """
    if not adk_available():
        return None

    runner, session_service = _get_runner()
    if runner is None:
        return None

    try:
        from google.genai import types

        session_id = f"evt-{event_data.get('event_id', uuid.uuid4().hex)}"
        await session_service.create_session(
            app_name=_APP_NAME, user_id=_USER_ID, session_id=session_id
        )

        message = types.Content(
            role="user", parts=[types.Part(text=_build_prompt(event_data, risk_assessment))]
        )

        final_text = ""
        async for event in runner.run_async(
            user_id=_USER_ID, session_id=session_id, new_message=message
        ):
            if event.is_final_response() and event.content and event.content.parts:
                final_text = "".join(p.text or "" for p in event.content.parts)

        result = _extract_json(final_text)
        if not result:
            logger.warning("ADK agent returned no parseable plan — falling back.")
            return None

        action = result.get("action")
        from .planning import ACTION_TYPES  # local import avoids a cycle at module load

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
    except Exception as e:  # pragma: no cover - depends on external service
        logger.warning(f"ADK planning failed, falling back: {e}")
        return None
