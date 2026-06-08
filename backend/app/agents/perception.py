"""
Perception Agent
==================
Analyzes incoming telemetry to assess crowd surge risk using:
  1. ML prediction (trained XGBoost/RandomForest model)
  2. Gemini LLM for qualitative context analysis
Falls back to a simple heuristic if both are unavailable.
"""

import json
import os
from loguru import logger

from ..config import settings
from ..ml.predictor import surge_predictor

# Lazy Gemini import – only initialize if API key is available
_gemini_model = None


def _get_gemini_model():
    global _gemini_model
    if _gemini_model is not None:
        return _gemini_model
    if not settings.GEMINI_API_KEY:
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _gemini_model = genai.GenerativeModel(settings.GEMINI_MODEL)
        logger.info(f"Gemini model initialized: {settings.GEMINI_MODEL}")
        return _gemini_model
    except Exception as e:
        logger.warning(f"Failed to initialize Gemini: {e}")
        return None


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

        # Stage 2: Gemini LLM Assessment (if API key is configured)
        llm_assessment = None
        gemini = _get_gemini_model()
        if gemini and settings.GEMINI_API_KEY:
            llm_assessment = await self._gemini_assess(gemini, event_data, ml_result)

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

    async def _gemini_assess(self, model, event_data: dict, ml_result: dict) -> str:
        """Use Gemini to generate a qualitative assessment."""
        prompt = f"""You are the Perception Agent for ArenaPulse, a stadium logistics intelligence system.

An ML model has already assessed this event. Provide a brief (2-3 sentence) qualitative analysis.

Event Data:
- Type: {event_data.get('event_type', 'unknown')}
- Location: {event_data.get('location', 'unknown')}
- Density Score: {event_data.get('density_score', 'N/A')}
- Predicted People: {event_data.get('predicted_people', 'N/A')}

ML Assessment:
- Risk Level: {ml_result['risk_level']}
- Surge Probability: {ml_result['probability']:.1%}
- Model: {ml_result['model_used']}

Provide your assessment as a concise paragraph. Focus on what the numbers mean operationally."""

        try:
            response = await model.generate_content_async(prompt)
            return response.text.strip()
        except Exception as e:
            logger.warning(f"Gemini assessment failed: {e}")
            return None
