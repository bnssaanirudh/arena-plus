"""Test environment overrides — must run before `app` is imported anywhere.

Tests assert the deterministic (heuristic) agent behavior, so Gemini must be
disabled: with a live key the LLM answers instead and assertions like
``plan["planner"] == "heuristic"`` become quota-dependent and flaky. Blanking
the key here wins over .env because load_dotenv() never overrides existing
env vars. Same reasoning for the LLM-judge eval (also a fire-and-forget task
that would outlive the test event loop).
"""

import os

os.environ["GEMINI_API_KEY"] = ""
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "false"
os.environ["USE_ADK"] = "false"
os.environ["PLAN_EVAL_ENABLED"] = "false"
