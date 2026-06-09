"""
Perception Agent
==================
Analyzes incoming telemetry to assess crowd surge risk using:
  1. ML prediction (trained XGBoost/RandomForest model)
  2. Gemini LLM for qualitative context analysis
Falls back to a simple heuristic if both are unavailable.
"""

from loguru import logger

from ..ml.predictor import surge_predictor
from ..llm import gemini


class PerceptionAgent:
    """
    Perception Agent
    Role: Analyze incoming raw telemetry and assess the risk level.
    
    Two-stage approach:
      Stage 1 – ML model for quantitative risk scoring
      Stage 2 – Gemini LLM for qualitative assessment and reasoning
    """

    async def analyze(self, event_data: dict) -> dict:
        logger.info(f"PerceptionAgent analyzing event: {event_data.get('event_id', 'unknown')}")

        # Stage 1: ML Prediction
        ml_result = surge_predictor.predict_surge(event_data)
        risk_level = ml_result["risk_level"]
        probability = ml_result["probability"]
        model_used = ml_result["model_used"]

        # Stage 2: Gemini qualitative assessment (if configured)
        llm_assessment = None
        if gemini.is_available():
            llm_assessment = await self._gemini_assess(event_data, ml_result)

        assessment_text = (
            llm_assessment if llm_assessment
            else f"ML model ({model_used}) predicted {risk_level} risk "
                 f"with {probability:.1%} surge probability."
        )

        return {
            "risk_level": risk_level,
            "probability": probability,
            "model_used": model_used,
            "assessment": assessment_text,
        }

    async def _gemini_assess(self, event_data: dict, ml_result: dict) -> str:
        """Use Gemini to generate a qualitative assessment. Returns None on failure."""
        prompt = f"""An ML model has already assessed this event. Provide a brief (2-3 sentence) qualitative analysis.

Event Data:
- Type: {event_data.get('event_type', 'unknown')}
- Location: {event_data.get('location', 'unknown')}
- Density Score: {event_data.get('density_score', 'N/A')}
- Predicted People: {event_data.get('predicted_people', 'N/A')}

ML Assessment:
- Risk Level: {ml_result['risk_level']}
- Surge Probability: {ml_result['probability']:.1%}
- Model: {ml_result['model_used']}

Focus on what the numbers mean operationally for stadium logistics."""

        return await gemini.generate_text(
            prompt,
            system_instruction=(
                "You are the Perception Agent for ArenaPulse, an autonomous stadium "
                "logistics intelligence system. Be concise and operational."
            ),
        )
