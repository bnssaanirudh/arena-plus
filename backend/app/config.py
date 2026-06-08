import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "ArenaPulse"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Simulator Settings
    SIMULATION_INTERVAL_SECONDS: int = 5
    SIMULATION_ACTIVE: bool = True
    
    # Gemini API
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = "gemini-2.0-flash"
    
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
