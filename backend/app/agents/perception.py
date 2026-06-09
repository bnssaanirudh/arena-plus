"""
Perception Agent
==================
Two-stage crowd risk assessment pipeline:

  Stage 1 — Fast pre-filter (ML / heuristic)
      SurgePredictor converts raw telemetry to a quick risk estimate.
      At runtime, live events carry <20% of the 53 trained features, so
      the heuristic path always fires. This is intentional — the pre-filter's
      job is to produce *context* fast, not to be the authoritative answer.

  Stage 2 — Gemini primary reasoning (when configured)
      Gemini receives the pre-filter signal plus the raw event and performs
      multi-factor qualitative reasoning. Its structured output (risk_level,
      probability, reasoning) becomes the final assessment.

When Gemini is not configured, Stage 1 output is used directly (honest
heuristic — no pretense of deep reasoning).
"""

from loguru import logger

from ..ml.predictor import surge_predictor
from ..llm import gemini


# JSON schema for Gemini structured output
_RISK_SCHEMA = {
    "type": "object",
    "properties": {
        "risk_level": {
            "type": "string",
            "enum": ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        },
        "probability": {
            "type": "number",
            "description": "Surge probability 0.0–1.0",
        },
        "reasoning": {
            "type": "string",
            "description": "2-3 sentence operational reasoning for this risk level",
        },
    },
    "required": ["risk_level", "probability", "reasoning"],
}


class PerceptionAgent:
    """
    Analyzes incoming telemetry and returns a structured risk assessment.

    Final output keys:
        risk_level  — LOW / MEDIUM / HIGH / CRITICAL
        probability — float 0-1
        model_used  — "gemini" | "heuristic_fallback" | trained-model-name
        assessment  — human-readable reasoning text
        pre_filter  — raw Stage 1 result (for transparency / debugging)
    """

    async def analyze(self, event_data: dict) -> dict:
        logger.info(f"PerceptionAgent analyzing event: {event_data.get('event_id', 'unknown')}")

        # ── Stage 1: fast pre-filter ──────────────────────────────────────────
        pre_filter = surge_predictor.predict_surge(event_data)
        logger.debug(
            f"Pre-filter: {pre_filter['risk_level']} ({pre_filter['probability']:.1%}) "
            f"via {pre_filter['model_used']}"
        )

        # ── Stage 2: Gemini primary reasoning (when available) ────────────────
        if gemini.is_available():
            gemini_result = await self._gemini_assess(event_data, pre_filter)
            if gemini_result is not None:
                return {
                    "risk_level": gemini_result["risk_level"],
                    "probability": round(float(gemini_result["probability"]), 4),
                    "model_used": "gemini",
                    "assessment": gemini_result["reasoning"],
                    "pre_filter": pre_filter,
                }

        # ── Fallback: use pre-filter directly ─────────────────────────────────
        return {
            "risk_level": pre_filter["risk_level"],
            "probability": pre_filter["probability"],
            "model_used": pre_filter["model_used"],
            "assessment": (
                f"Fast triage ({pre_filter['model_used']}): "
                f"{pre_filter['risk_level']} risk — "
                f"{pre_filter['probability']:.1%} surge probability. "
                "(Gemini reasoning not available.)"
            ),
            "pre_filter": pre_filter,
        }

    async def _gemini_assess(self, event_data: dict, pre_filter: dict) -> dict | None:
        """
        Ask Gemini for a structured risk assessment.
        Returns parsed dict with risk_level / probability / reasoning, or None on failure.
        """
        prompt = f"""You are the Perception Agent for ArenaPulse, an autonomous stadium
logistics platform. A fast triage filter has already produced a preliminary risk estimate.
Your job is to reason over all available signals and produce the authoritative assessment.

Raw telemetry:
  event_type      : {event_data.get('event_type', 'unknown')}
  location        : {event_data.get('location', 'unknown')}
  density_score   : {event_data.get('density_score', 'N/A')} / 10
  predicted_people: {event_data.get('predicted_people', 'N/A')}

Triage pre-filter (fast heuristic signal — use as context only):
  risk_level  : {pre_filter['risk_level']}
  probability : {pre_filter['probability']:.1%}
  model       : {pre_filter['model_used']}

Assess the surge risk for the NEXT 20 MINUTES.
Consider: crowd density trajectory, event type severity, people count relative to capacity,
and operational logistics impact (dispatch readiness, evacuation feasibility).
Return probability as a float between 0.0 and 1.0."""

        return await gemini.generate_json(prompt, schema=_RISK_SCHEMA)
