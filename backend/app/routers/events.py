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


# Three zones surge at once — proves true multi-agent concurrency: the
# pipelines run in parallel and compete for the same vendor stock, so
# inventory contention is visible (later allocations see depleted vendors).
_MULTI_SURGE_ZONES = [
    ("South Gate", 9.2, 9500, 33.9494, -118.3395),
    ("North Gate", 8.7, 7800, 33.9574, -118.3379),
    ("Food Court", 8.4, 5200, 33.9540, -118.3392),
]


async def _run_multi_surge():
    from ..simulator.events import generate_random_event
    for i, (zone, density, people, lat, lon) in enumerate(_MULTI_SURGE_ZONES):
        event = generate_random_event()
        event.update({
            "event_type": "crowd_surge",
            "location": zone,
            "density_score": density,
            "predicted_people": people,
            "latitude": lat,
            "longitude": lon,
        })
        await pubsub.publish("arena:telemetry:raw", event, source="MultiSurge")
        asyncio.create_task(agent_manager.process_event(event))
        # Slight stagger keeps the WS stream readable while pipelines still overlap.
        if i < len(_MULTI_SURGE_ZONES) - 1:
            await asyncio.sleep(1.5)


@router.post("/demo/multi")
async def run_multi_surge():
    """Fire 3 concurrent zone surges — demonstrates parallel pipelines and
    inventory contention (agents compete for the same depot stock)."""
    asyncio.create_task(_run_multi_surge())
    return {
        "status": "multi_surge_started",
        "zones": [z[0] for z in _MULTI_SURGE_ZONES],
        "message": "3 concurrent surges — watch pipelines compete for stock",
    }
