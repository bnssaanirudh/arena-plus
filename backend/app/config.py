import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=True, extra="ignore")

    PROJECT_NAME: str = "ArenaPulse"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"

    # CORS — wildcard + credentials is rejected by browsers; list explicit origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:4173",
        "http://localhost:3000",
    ]

    # Simulator Settings
    SIMULATION_INTERVAL_SECONDS: int = 5
    SIMULATION_ACTIVE: bool = True
    
    # Gemini (google-genai SDK) — supports both Vertex AI and AI Studio.
    # Vertex AI is the path for the hackathon (Agent Builder / ADK + Cloud Run).
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")          # AI Studio key (dev/local)
    GOOGLE_GENAI_USE_VERTEXAI: bool = os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "false").lower() == "true"
    GOOGLE_CLOUD_PROJECT: str = os.getenv("GOOGLE_CLOUD_PROJECT", "")
    GOOGLE_CLOUD_LOCATION: str = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
    # Set to the exact Gemini 3 model id available in your project (verify in Vertex AI / AI Studio).
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3-pro-preview")
    # Embedding model for semantic (kNN) retrieval — generous free-tier quota.
    GEMINI_EMBED_MODEL: str = os.getenv("GEMINI_EMBED_MODEL", "gemini-embedding-001")
    # Truncated embedding dimensionality (matches the dense_vector mapping in ES).
    EMBED_DIMS: int = int(os.getenv("EMBED_DIMS", "768"))

    # Google Cloud Agent Builder / ADK. When True (and google-adk is installed and
    # Gemini is configured), the planning brain runs as an ADK LlmAgent that can
    # autonomously call the Elastic vendor-search tool. Falls back to direct Gemini
    # JSON, then the deterministic heuristic — preserving zero-external-deps boot.
    USE_ADK: bool = os.getenv("USE_ADK", "true").lower() == "true"

    # Human-in-the-loop oversight. When True, high-impact actions (EVACUATE_ZONE and
    # large dispatches) are held as PENDING_APPROVAL instead of auto-executing.
    APPROVAL_REQUIRED: bool = os.getenv("APPROVAL_REQUIRED", "false").lower() == "true"
    # A dispatch is "high impact" once requested water+food exceeds this threshold.
    APPROVAL_RESOURCE_THRESHOLD: int = int(os.getenv("APPROVAL_RESOURCE_THRESHOLD", "5000"))
    
    # Strict RAG compliance. When True, constraints verification can trigger replanning.
    STRICT_RAG: bool = os.getenv("STRICT_RAG", "true").lower() == "true"

    # LLM-judge evaluation of each executed plan (1 extra Gemini call per pipeline).
    # Scores land as OTel span attributes → visible in Arize Phoenix traces.
    PLAN_EVAL_ENABLED: bool = os.getenv("PLAN_EVAL_ENABLED", "true").lower() == "true"

    # ML Model
    ML_MODEL_PATH: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "models", "surge_predictor.joblib"
    )
    
    # Agent Settings
    DRY_RUN: bool = True  # When True, execution agent logs but doesn't modify state
    
    # Data Infrastructure (mock for now)
    REDIS_URL: str = "mock://localhost"
    
    # Paths
    DATA_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")

settings = Settings()
