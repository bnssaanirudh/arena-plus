import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "ArenaPulse"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"

    # CORS — wildcard + credentials is rejected by browsers; list explicit origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
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
    
    class Config:
        case_sensitive = True

settings = Settings()
