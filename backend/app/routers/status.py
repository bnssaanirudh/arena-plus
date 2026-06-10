from fastapi import APIRouter
from typing import Dict, Any, Optional
from pydantic import BaseModel
import os
from ..elastic.client import check_connection, es_client
from ..elastic.indexes import INDEXES
from ..config import settings
from ..simulator.engine import simulator_engine

router = APIRouter()

class SettingsUpdateRequest(BaseModel):
    approval_required: Optional[bool] = None
    strict_rag: Optional[bool] = None
    simulation_interval_seconds: Optional[int] = None

@router.get("/")
async def get_system_status() -> Dict[str, Any]:
    # Check Elasticsearch
    es_live = await check_connection()
    es_url = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
    
    # Simple obfuscation of URL credentials if present
    if "@" in es_url:
        parts = es_url.split("@")
        es_url = "https://***:***@" + parts[-1]
        
    es_counts = {}
    if es_live:
        for idx in INDEXES.keys():
            try:
                res = await es_client.count(index=idx)
                es_counts[idx] = res.get("count", 0)
            except Exception:
                es_counts[idx] = 0
    else:
        es_counts = {idx: 0 for idx in INDEXES.keys()}

    # Check Arize Phoenix
    phoenix_endpoint = os.getenv("PHOENIX_COLLECTOR_ENDPOINT", "")
    phoenix_active = bool(phoenix_endpoint)
    
    # Check Gemini config
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    gemini_key_configured = bool(gemini_key)
    
    # Compile status
    return {
        "status": "healthy",
        "elasticsearch": {
            "connected": es_live,
            "url": es_url,
            "index_counts": es_counts
        },
        "arize_phoenix": {
            "active": phoenix_active,
            "endpoint": phoenix_endpoint,
            "authenticated": bool(os.getenv("PHOENIX_API_KEY", ""))
        },
        "simulator": {
            "active": settings.SIMULATION_ACTIVE,
            "running": simulator_engine.running,
            "interval_seconds": settings.SIMULATION_INTERVAL_SECONDS
        },
        "gemini": {
            "key_configured": gemini_key_configured,
            "use_vertex_ai": settings.GOOGLE_GENAI_USE_VERTEXAI,
            "model": settings.GEMINI_MODEL,
            "use_adk": settings.USE_ADK
        },
        "system": {
            "dry_run": settings.DRY_RUN,
            "version": settings.VERSION,
            "project_name": settings.PROJECT_NAME,
            "approval_required": settings.APPROVAL_REQUIRED,
            "strict_rag": settings.STRICT_RAG
        }
    }

@router.post("/settings")
async def update_settings(req: SettingsUpdateRequest) -> Dict[str, Any]:
    if req.approval_required is not None:
        settings.APPROVAL_REQUIRED = req.approval_required
    if req.strict_rag is not None:
        settings.STRICT_RAG = req.strict_rag
    if req.simulation_interval_seconds is not None:
        if req.simulation_interval_seconds > 0:
            settings.SIMULATION_INTERVAL_SECONDS = req.simulation_interval_seconds
            
    return {
        "status": "success",
        "settings": {
            "approval_required": settings.APPROVAL_REQUIRED,
            "strict_rag": settings.STRICT_RAG,
            "simulation_interval_seconds": settings.SIMULATION_INTERVAL_SECONDS
        }
    }
