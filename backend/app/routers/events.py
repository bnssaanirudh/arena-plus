import asyncio
from fastapi import APIRouter, Request
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
from ..simulator.engine import simulator_engine
from ..simulator.events import generate_random_event, EVENT_TYPES
from ..infra.pubsub import pubsub
from ..agents.manager import agent_manager
from typing import List, Dict, Any, Optional

router = APIRouter()


class TriggerEventRequest(BaseModel):
    event_type: Optional[str] = None  # if None, random surge-biased type


@router.post("/trigger")
async def trigger_event(body: TriggerEventRequest = TriggerEventRequest()):
    """Manually inject a telemetry event and run it through the agent pipeline."""
    event = generate_random_event()
    if body.event_type and body.event_type in EVENT_TYPES:
        event["event_type"] = body.event_type
        # Boost density for surge types so the UI lights up
        if body.event_type in ("crowd_surge", "security_alert"):
            event["density_score"] = max(event["density_score"], 8.0)

    await pubsub.publish("arena:telemetry:raw", event, source="ManualTrigger")
    asyncio.create_task(agent_manager.process_event(event))
    return {"status": "triggered", "event_id": event["event_id"], "event_type": event["event_type"]}


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
    return []
