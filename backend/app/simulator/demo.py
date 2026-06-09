"""
Scripted Demo Scenario  (HACKATHON_PLAN 4.3)
=============================================
A pre-scripted 5-event surge cascade that reliably tells the ArenaPulse story
for the demo video — problem → rising tension → full pipeline fires → AI
reasons, verifies, self-corrects, dispatches → resolution.

The scenario uses SoFi Stadium (Los Angeles) coordinates so the Leaflet map
shows meaningful cluster movement. Events are spaced with deliberate delays so
each pipeline stage is visible in the dashboard before the next event hits.

Run via POST /api/v1/events/demo — fires as a background async task.
"""

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List

from loguru import logger

from ..agents.manager import agent_manager
from ..infra.pubsub import pubsub

# SoFi Stadium approximate compass points (lat, lon)
_ZONE_COORDS: Dict[str, tuple] = {
    "North Gate":       (33.9574, -118.3379),
    "South Gate":       (33.9494, -118.3395),
    "East Gate":        (33.9534, -118.3342),
    "West Gate":        (33.9534, -118.3448),
    "Food Court":       (33.9540, -118.3392),
    "Merchandise Zone": (33.9552, -118.3375),
    "Parking":          (33.9510, -118.3420),
    "VIP Section":      (33.9548, -118.3388),
}

# Each step: delay_before (seconds), then publish + run pipeline
_SCENARIO: List[Dict[str, Any]] = [
    {
        "delay": 0,
        "event_type": "normal_flow",
        "location": "North Gate",
        "density_score": 2.5,
        "predicted_people": 800,
        "label": "Step 1/5 — Normal flow, all calm",
    },
    {
        "delay": 6,
        "event_type": "congestion",
        "location": "South Gate",
        "density_score": 6.8,
        "predicted_people": 4500,
        "label": "Step 2/5 — Congestion building at South Gate",
    },
    {
        "delay": 8,
        "event_type": "crowd_surge",
        "location": "South Gate",
        "density_score": 9.4,
        "predicted_people": 11000,
        "label": "Step 3/5 — SURGE! Agent plans dispatch + RAG verification flags road closure → self-correction",
    },
    {
        "delay": 10,
        "event_type": "security_alert",
        "location": "West Gate",
        "density_score": 8.1,
        "predicted_people": 6000,
        "label": "Step 4/5 — Security alert at West Gate → agent alerts security + flash deal",
    },
    {
        "delay": 12,
        "event_type": "normal_flow",
        "location": "South Gate",
        "density_score": 3.2,
        "predicted_people": 1200,
        "label": "Step 5/5 — Recovery — crowd dispersed, situation resolved",
    },
]


async def run_demo_scenario() -> None:
    """Fire the scripted scenario. Called as an asyncio background task."""
    logger.info("🎬 Demo scenario started — 5-event surge cascade")

    # Announce start over the pipeline channel so the dashboard shows it
    await pubsub.publish("agent.pipeline", {
        "event_id": "demo",
        "stage": "DEMO_STARTED",
        "message": "Scripted demo scenario activated — 5-event surge cascade",
    }, source="DemoScenario")

    for i, step in enumerate(_SCENARIO):
        await asyncio.sleep(step["delay"])

        zone = step["location"]
        lat, lon = _ZONE_COORDS.get(zone, (33.9534, -118.3392))

        event: Dict[str, Any] = {
            "event_id": str(uuid.uuid4()),
            "event_type": step["event_type"],
            "location": zone,
            "density_score": step["density_score"],
            "predicted_people": step["predicted_people"],
            "latitude": lat,
            "longitude": lon,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "demo": True,
            "demo_step": i + 1,
            "demo_label": step["label"],
        }

        logger.info(f"🎬 Demo {step['label']}")
        await pubsub.publish("arena:telemetry:raw", event, source="DemoScenario")
        asyncio.create_task(agent_manager.process_event(event))

    logger.info("🎬 Demo scenario complete")
    await pubsub.publish("agent.pipeline", {
        "event_id": "demo",
        "stage": "DEMO_COMPLETE",
        "message": "Demo scenario finished — all 5 events processed",
    }, source="DemoScenario")
