from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import json
from datetime import datetime, timezone
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

    channels_to_listen = [
        "arena:telemetry:raw",
        Channels.AGENT_PIPELINE,
        Channels.AGENT_PERCEPTION,
        Channels.AGENT_PLANNING,
        Channels.AGENT_INVENTORY,
        Channels.AGENT_VALIDATION,
        Channels.AGENT_VERIFICATION,
        Channels.AGENT_EXECUTION,
        Channels.AGENT_MARKETING,
    ]

    queues = []
    for ch in channels_to_listen:
        q = await pubsub.subscribe(ch)
        queues.append(q)

    try:
        async for raw_msg in multiplex_queues(queues):
            try:
                msg = json.loads(raw_msg)
            except Exception:
                continue

            channel = msg.get("channel", "")
            data = msg.get("data", {})
            source = msg.get("source", "system")
            timestamp = msg.get("timestamp", datetime.now(timezone.utc).isoformat())

            # ----------------------------------------------------------------
            # Raw telemetry
            # ----------------------------------------------------------------
            if channel == "arena:telemetry:raw":
                await websocket.send_json({"type": "telemetry", "data": data})
                continue

            # ----------------------------------------------------------------
            # Agent channels — always emit an agent_action for AgentPanel,
            # then emit additional rich-typed messages for the new panels.
            # ----------------------------------------------------------------
            if not channel.startswith("agent."):
                continue

            action_text = "Processing event..."
            reasoning = ""
            extra_payloads = []  # additional typed messages to send

            if channel == Channels.AGENT_PERCEPTION:
                assessment = data.get("risk_assessment", {})
                risk = assessment.get("risk_level", "UNKNOWN")
                prob = assessment.get("probability", 0)
                action_text = f"Assessed risk: {risk} ({prob:.0%})"
                reasoning = assessment.get("assessment", "")

            elif channel == Channels.AGENT_PLANNING:
                plan = data.get("plan", {})
                prefix = "↻ Re-plan: " if data.get("self_correction") else "Plan: "
                action_text = f"{prefix}{plan.get('action', 'UNKNOWN')} [{plan.get('priority', '')}]"
                reasoning = plan.get("reasoning", "")
                if data.get("correction_applied"):
                    reasoning = f"[Correction: {data['correction_applied']}] {reasoning}"

            elif channel == Channels.AGENT_INVENTORY:
                alloc = data.get("allocation", {})
                count = len(alloc.get("allocations", []))
                shortfall = alloc.get("shortfall", {})
                action_text = f"Allocated {count} vendor(s)"
                if shortfall.get("water", 0) > 0 or shortfall.get("food", 0) > 0:
                    action_text += f" (shortfall: water={shortfall.get('water',0)}, food={shortfall.get('food',0)})"
                reasoning = alloc.get("status", "")

            elif channel == Channels.AGENT_VALIDATION:
                validation = data.get("validation", {})
                action_text = f"Validation: {validation.get('status', 'UNKNOWN')}"
                reasoning = validation.get("reason", "")

            elif channel == Channels.AGENT_VERIFICATION:
                v = data.get("verification", {})
                feasible = v.get("feasible", True)
                confidence = v.get("confidence", "")
                replans = data.get("replan_count", 0)
                blocking = v.get("blocking", [])
                if feasible:
                    action_text = f"✅ Plan verified feasible [{confidence}]"
                    reasoning = f"{len(v.get('constraints', []))} constraint(s) checked — no blockers"
                else:
                    action_text = f"⚠️ Infeasible — self-correcting (attempt {replans + 1})"
                    reasoning = v.get("correction", "") or "; ".join(blocking[:2])
                # Rich typed message for Verification panel
                extra_payloads.append({
                    "type": "verification",
                    "data": {
                        "event_id": data.get("event_id"),
                        "feasible": feasible,
                        "confidence": confidence,
                        "blocking": blocking,
                        "correction": v.get("correction", ""),
                        "replan_count": replans,
                        "constraints_checked": len(v.get("constraints", [])),
                        "verified_by": v.get("verified_by", ""),
                        "timestamp": timestamp,
                    }
                })

            elif channel == Channels.AGENT_EXECUTION:
                execution = data.get("execution", {})
                status = execution.get("status", "UNKNOWN")
                if status == "PENDING_APPROVAL":
                    action_text = f"⏸ Awaiting human approval: {execution.get('action', '')}"
                    reasoning = "High-impact action held for operator sign-off"
                    # Rich typed message for Approval Queue panel
                    extra_payloads.append({
                        "type": "approval_needed",
                        "data": {
                            "event_id": data.get("event_id"),
                            "action": execution.get("action", ""),
                            "timestamp": timestamp,
                        }
                    })
                else:
                    executed = execution.get("executed_allocations") or execution.get("planned_allocations", [])
                    orders = execution.get("restock_orders", [])
                    action_text = f"Execution: {status} ({len(executed)} allocation(s))"
                    if orders:
                        action_text += f", {len(orders)} restock order(s)"
                    # Rich typed message for Restock Orders panel
                    if orders:
                        extra_payloads.append({
                            "type": "restock_orders",
                            "data": {
                                "event_id": data.get("event_id"),
                                "orders": orders,
                                "timestamp": timestamp,
                            }
                        })
                reasoning = ""

            elif channel == Channels.AGENT_MARKETING:
                deal = data.get("deal", {})
                action_text = f"Flash deal: {deal.get('headline', '')}"
                reasoning = deal.get("message", "")
                # Rich typed message for Campaigns panel
                extra_payloads.append({
                    "type": "flash_deal",
                    "data": {
                        "event_id": data.get("event_id"),
                        **deal,
                        "timestamp": timestamp,
                    }
                })

            elif channel == Channels.AGENT_PIPELINE:
                stage = data.get("stage", "")
                action_text = f"Pipeline {stage}"
                reasoning = f"Event ID: {data.get('event_id', '')}"
                # Approval resolved — notify frontend to remove from queue
                if stage == "COMPLETED":
                    extra_payloads.append({
                        "type": "approval_resolved",
                        "data": {"event_id": data.get("event_id"), "result": data.get("result")}
                    })

            # Always send the agent_action for AgentPanel
            await websocket.send_json({
                "type": "agent_action",
                "data": {
                    "agent_name": source,
                    "action": action_text,
                    "reasoning": reasoning,
                    "timestamp": timestamp,
                }
            })
            # Send any additional rich-typed messages
            for extra in extra_payloads:
                await websocket.send_json(extra)

    except WebSocketDisconnect:
        logger.info("Dashboard WebSocket disconnected")
    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        for ch, q in zip(channels_to_listen, queues):
            await pubsub.unsubscribe(ch, q)
