from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import json
from loguru import logger

from ..infra.pubsub import pubsub, Channels

router = APIRouter()

async def multiplex_queues(queues):
    """Multiplexes messages from multiple asyncio Queues into a single async generator."""
    tasks = [asyncio.create_task(q.get()) for q in queues]
    try:
        while True:
            done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            for task in done:
                msg = task.result()
                # Find which queue this task belonged to so we can replace it
                idx = tasks.index(task)
                tasks[idx] = asyncio.create_task(queues[idx].get())
                yield msg
    except asyncio.CancelledError:
        for t in tasks:
            t.cancel()
        raise

@router.websocket("/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket connection accepted for Dashboard")
    
    # Subscribe to raw telemetry and all agent channels
    channels_to_listen = [
        "arena:telemetry:raw",
        Channels.AGENT_PIPELINE,
        Channels.AGENT_PERCEPTION,
        Channels.AGENT_PLANNING,
        Channels.AGENT_INVENTORY,
        Channels.AGENT_VALIDATION,
        Channels.AGENT_EXECUTION
    ]
    
    queues = []
    for ch in channels_to_listen:
        q = await pubsub.subscribe(ch)
        queues.append(q)
        
    try:
        async for raw_msg in multiplex_queues(queues):
            # Parse the JSON message from pubsub
            try:
                msg = json.loads(raw_msg)
            except Exception:
                continue
                
            channel = msg.get("channel", "")
            data = msg.get("data", {})
            source = msg.get("source", "system")
            
            # Format message for frontend
            if channel == "arena:telemetry:raw":
                payload = {
                    "type": "telemetry",
                    "data": data
                }
            elif channel.startswith("agent."):
                # We extract the relevant text/action for the AgentPanel
                action_text = "Processing event..."
                reasoning = ""
                
                if channel == Channels.AGENT_PERCEPTION:
                    assessment = data.get("risk_assessment", {})
                    action_text = f"Assessed risk: {assessment.get('risk_level', 'UNKNOWN')}"
                    reasoning = assessment.get("assessment", "")
                elif channel == Channels.AGENT_PLANNING:
                    plan = data.get("plan", {})
                    action_text = f"Formulated plan: {plan.get('action', 'UNKNOWN')}"
                    reasoning = plan.get("reasoning", "")
                elif channel == Channels.AGENT_PIPELINE:
                    stage = data.get("stage", "")
                    action_text = f"Pipeline {stage}"
                    reasoning = f"Event ID: {data.get('event_id', '')}"
                
                payload = {
                    "type": "agent_action",
                    "data": {
                        "agent_name": source,
                        "action": action_text,
                        "reasoning": reasoning
                    }
                }
            else:
                continue

            await websocket.send_json(payload)
            
    except WebSocketDisconnect:
        logger.info("Dashboard WebSocket disconnected")
    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        # Cleanup subscriptions
        for ch, q in zip(channels_to_listen, queues):
            await pubsub.unsubscribe(ch, q)
