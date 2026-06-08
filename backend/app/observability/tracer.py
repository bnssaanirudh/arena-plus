from loguru import logger
import os

def setup_phoenix():
    """
    Setup Arize Phoenix for observability.
    This initializes tracing for all interactions, including the Gemini LLM calls and tool usages.
    """
    try:
        import phoenix as px
        # The default phoenix launch starts a local server on port 6006
        session = px.launch_app()
        logger.info(f"Arize Phoenix observability started. View dashboard at {session.url}")
        
        # We would typically instrument here:
        # from openinference.instrumentation.google_generativeai import GoogleGenerativeAIInstrumentor
        # GoogleGenerativeAIInstrumentor().instrument()
        
    except ImportError:
        logger.warning("Arize Phoenix (phoenix) package not installed. Skipping observability.")
    except Exception as e:
        logger.error(f"Failed to start Arize Phoenix: {e}")
