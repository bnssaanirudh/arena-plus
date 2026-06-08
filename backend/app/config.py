import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "ArenaPulse"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Simulator Settings
    SIMULATION_INTERVAL_SECONDS: int = 5
    SIMULATION_ACTIVE: bool = True
    
    # Paths
    DATA_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
    
    class Config:
        case_sensitive = True

settings = Settings()
