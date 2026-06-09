from loguru import logger


def setup_phoenix():
    """
    Set up Arize Phoenix for agent observability (the Arize partner integration).
    Initializes tracing for Gemini reasoning calls and MCP tool usage.
    No-op (with a warning) if the phoenix package isn't installed.
    """
    try:
        import phoenix as px

        session = px.launch_app()  # local UI on :6006
        logger.info(f"Arize Phoenix observability started. Dashboard: {session.url}")
        # OpenInference instrumentation for google-genai + ADK is wired in HACKATHON_PLAN 3.2.
    except ImportError:
        logger.warning("Arize Phoenix not installed. Skipping observability.")
    except Exception as e:
        logger.error(f"Failed to start Arize Phoenix: {e}")
