import asyncio
from fastapi import APIRouter
from pydantic import BaseModel
from ..simulator.events import generate_random_event, EVENT_TYPES
from ..simulator.demo import run_demo_scenario
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


@router.get("/history")
async def event_history(limit: int = 50) -> List[Dict[str, Any]]:
    try:
        from ..elastic.client import es_client
        # Query Elasticsearch crowd_events index sorted by timestamp descending
        query = {
            "query": {"match_all": {}},
            "sort": [{"timestamp": {"order": "desc"}}],
            "size": min(limit, 100)
        }
        res = await es_client.search(index="crowd_events", body=query)
        hits = [hit["_source"] for hit in res.get("hits", {}).get("hits", [])]
        if hits:
            return hits
    except Exception:
        # Fall back to in-memory history
        pass

    return pubsub.get_telemetry_history(limit=min(limit, 100))


@router.post("/demo")
async def run_demo():
    """Trigger the scripted 5-event surge cascade for demo/recording purposes.
    Fires as a background task — returns immediately, events stream over WebSocket."""
    asyncio.create_task(run_demo_scenario())
    return {
        "status": "demo_started",
        "steps": 5,
        "message": "5-event surge cascade started — watch the dashboard",
    }
