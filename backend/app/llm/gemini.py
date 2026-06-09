"""
Gemini 3 client (google-genai SDK)
===================================
Unified async wrapper used as the reasoning brain across the agent pipeline.

Supports two auth modes, selected by config:
  - Vertex AI   (GOOGLE_GENAI_USE_VERTEXAI=true + GOOGLE_CLOUD_PROJECT) — the
    hackathon path (Agent Builder / ADK + Cloud Run).
  - AI Studio   (GEMINI_API_KEY) — convenient for local dev.

If neither is configured, `is_available()` returns False and callers fall back
to their heuristic logic — preserving ArenaPulse's zero-external-deps property.
"""

import json
from typing import Any, Dict, Optional

from loguru import logger

from ..config import settings

_client = None
_init_attempted = False


def _get_client():
    """Lazily construct a google-genai client for the configured auth mode."""
    global _client, _init_attempted
    if _init_attempted:
        return _client
    _init_attempted = True

    try:
        from google import genai  # noqa: F401

        if settings.GOOGLE_GENAI_USE_VERTEXAI and settings.GOOGLE_CLOUD_PROJECT:
            _client = genai.Client(
                vertexai=True,
                project=settings.GOOGLE_CLOUD_PROJECT,
                location=settings.GOOGLE_CLOUD_LOCATION,
            )
            logger.info(
                f"Gemini client ready (Vertex AI, project={settings.GOOGLE_CLOUD_PROJECT}, "
                f"model={settings.GEMINI_MODEL})"
            )
        elif settings.GEMINI_API_KEY:
            _client = genai.Client(api_key=settings.GEMINI_API_KEY)
            logger.info(f"Gemini client ready (AI Studio, model={settings.GEMINI_MODEL})")
        else:
            logger.info("Gemini not configured — agents will use heuristic fallback.")
            _client = None
    except Exception as e:  # pragma: no cover - depends on external SDK/creds
        logger.warning(f"Failed to initialize Gemini client: {e}")
        _client = None

    return _client


def is_available() -> bool:
    """True if a Gemini client could be constructed for the current config."""
    return _get_client() is not None


async def generate_text(prompt: str, system_instruction: Optional[str] = None) -> Optional[str]:
    """Generate free-form text. Returns None on any failure (caller falls back)."""
    client = _get_client()
    if client is None:
        return None
    try:
        from google.genai import types

        config = None
        if system_instruction:
            config = types.GenerateContentConfig(system_instruction=system_instruction)

        response = await client.aio.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=config,
        )
        return (response.text or "").strip() or None
    except Exception as e:  # pragma: no cover - depends on external service
        logger.warning(f"Gemini generate_text failed: {e}")
        return None


async def generate_json(
    prompt: str,
    schema: Optional[Dict[str, Any]] = None,
    system_instruction: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Generate a structured JSON object. Returns None on failure so callers
    can fall back to deterministic logic.

    `schema` is an optional google-genai response schema (dict form) to
    constrain the output.
    """
    client = _get_client()
    if client is None:
        return None
    try:
        from google.genai import types

        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            system_instruction=system_instruction,
        )
        if schema is not None:
            config.response_schema = schema

        response = await client.aio.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=config,
        )
        raw = (response.text or "").strip()
        if not raw:
            return None
        return json.loads(raw)
    except Exception as e:  # pragma: no cover - depends on external service
        logger.warning(f"Gemini generate_json failed: {e}")
        return None
