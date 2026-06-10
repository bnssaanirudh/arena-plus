"""
Arize Phoenix observability — lightweight OTLP setup.

Uses `arize-phoenix-otel` (not the heavy `arize-phoenix` server package) so it
doesn't conflict with google-adk's opentelemetry-sdk<1.42 pin.

Activation:
  Set PHOENIX_COLLECTOR_ENDPOINT in .env to point to:
  - Local Phoenix server:  http://localhost:6006/v1/traces
  - Arize AX cloud:        https://app.arize.com/... (M6 task, needs PHOENIX_API_KEY)

Without PHOENIX_COLLECTOR_ENDPOINT the tracer is a zero-cost no-op.
"""

import os
from loguru import logger


def setup_phoenix() -> None:
    """
    Wire OpenTelemetry traces to Arize Phoenix / Arize AX.

    No-op when PHOENIX_COLLECTOR_ENDPOINT is not set, or if the
    required packages aren't installed — backend boots normally either way.
    """
    endpoint = os.environ.get("PHOENIX_COLLECTOR_ENDPOINT", "")
    if not endpoint:
        logger.info(
            "Arize observability disabled — set PHOENIX_COLLECTOR_ENDPOINT to enable. "
            "(See backend/.env.example)"
        )
        return

    try:
        from phoenix.otel import register  # arize-phoenix-otel

        api_key = os.environ.get("PHOENIX_API_KEY", "")
        # Space-scoped endpoint (app.phoenix.arize.com/s/<space>/v1/traces) requires
        # Authorization: Bearer — not the generic api_key header.
        headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
        tracer_provider = register(
            project_name="arenapulse",
            endpoint=endpoint,
            headers=headers,
        )
        logger.info(f"Arize Phoenix OTel tracing active → {endpoint} (authenticated={bool(api_key)})")

        # ── Instrument Gemini (google-genai) if available ──────────────────
        try:
            from openinference.instrumentation.google_genai import GoogleGenAIInstrumentor
            GoogleGenAIInstrumentor().instrument(tracer_provider=tracer_provider)
            logger.info("OpenInference: google-genai instrumented")
        except ImportError:
            logger.debug("openinference-instrumentation-google-genai not installed — skipping Gemini traces")

    except ImportError:
        logger.warning(
            "arize-phoenix-otel not installed — `pip install arize-phoenix-otel` to enable tracing."
        )
    except Exception as exc:
        logger.error(f"Failed to initialise Arize tracing: {exc}")
