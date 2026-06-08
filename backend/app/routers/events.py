from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse
from ..simulator.engine import simulator_engine
from typing import List, Dict, Any

router = APIRouter()

@router.get("/live")
async def live_events(request: Request):
    """Server-Sent Events endpoint for live telemetry."""
    async def event_generator():
        async for event_json in simulator_engine.subscribe():
            if await request.is_disconnected():
                break
            yield {"data": event_json}
            
    return EventSourceResponse(event_generator())

@router.get("/history")
async def event_history() -> List[Dict[str, Any]]:
    # To be implemented when ElasticSearch is integrated
    return []
