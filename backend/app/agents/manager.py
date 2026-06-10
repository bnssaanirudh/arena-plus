"""
Agent Manager
===============
Orchestrates the multi-agent pipeline:
  Event → Perception → Planning → Inventory → Validation
        → Verification (RAG feasibility + self-correction loop)
        → [human approval gate] → Execution → Marketing

Publishes intermediate state to pub/sub channels at each stage so the
frontend dashboard can display real-time agent activity.

Self-correction: if VerificationAgent flags the plan as infeasible, the
manager re-runs Planning with the constraint context injected, then
re-runs Inventory+Validation on the new plan. Up to MAX_REPLANS attempts
before proceeding anyway (prevents infinite loops).

Human-in-the-loop: when ``APPROVAL_REQUIRED`` is set and a plan is high-impact
(EVACUATE_ZONE or a large dispatch), the pipeline pauses at PENDING_APPROVAL and
waits for ``resolve_approval()`` (driven by the approvals REST endpoint) before
executing — the "you stay in control" guarantee.
"""

import asyncio
from datetime import datetime, timezone
from typing import Dict, Optional

from loguru import logger

from ..config import settings
from .perception import PerceptionAgent
from .planning import PlanningAgent
from .inventory import InventoryAgent
from .validation import ValidationAgent
from .verification import VerificationAgent
from .execution import ExecutionAgent, schedule_supplier_acks
from .marketing import MarketingAgent
from ..infra.pubsub import pubsub, Channels

# Max re-plan attempts before accepting an infeasible plan and continuing
MAX_REPLANS = 2


class AgentManager:
    def __init__(self):
        self.perception = PerceptionAgent()
        self.planning = PlanningAgent()
        self.inventory = InventoryAgent()
        self.validation = ValidationAgent()
        self.verification = VerificationAgent()
        self.execution = ExecutionAgent()
        self.marketing = MarketingAgent()
        # event_id -> context awaiting human approval
        self._pending: Dict[str, dict] = {}

    @staticmethod
    def _is_high_impact(plan: dict) -> bool:
        """High-impact actions need human sign-off when oversight is enabled."""
        if plan.get("action") == "EVACUATE_ZONE":
            return True
        res = plan.get("resources_required", {}) or {}
        return (res.get("water", 0) + res.get("food", 0)) >= settings.APPROVAL_RESOURCE_THRESHOLD

    @staticmethod
    def _record_planning_decision(event_data: dict, plan: dict) -> None:
        """Write the decision to the agent_decisions ES index (institutional
        memory the PlanningAgent recalls on future events in the same zone).
        Fire-and-forget — memory is a bonus, never a blocker."""
        from ..mcp.tools import MCPTools
        zone = event_data.get("location", "unknown")
        asyncio.create_task(MCPTools.record_agent_action(
            agent_name="PlanningAgent",
            action=f"{plan.get('action', 'UNKNOWN')} at {zone} [{plan.get('priority', '')}]",
            reasoning=plan.get("reasoning", ""),
        ))

    async def process_event(self, event_data: dict) -> dict:
        """
        Pipeline:
        Event → Perception → Planning → Inventory → Validation
              → Verification (RAG + self-correction loop, up to MAX_REPLANS)
              → [approval gate] → Execution → Marketing
        """
        event_id = event_data.get('event_id', 'unknown')
        logger.info(f"--- Agent Workflow Started for Event {event_id} ---")

        await pubsub.publish(Channels.AGENT_PIPELINE, {
            "event_id": event_id,
            "stage": "STARTED",
            "event_data": event_data,
        }, source="AgentManager")

        # Index the event in Elasticsearch crowd_events
        try:
            from ..elastic.client import es_client
            es_doc = {
                "event_id": event_id,
                "event_type": event_data.get("event_type"),
                "location": event_data.get("location"),
                "density_score": float(event_data.get("density_score", 0.0)),
                "predicted_people": int(event_data.get("predicted_people", 0)),
                "latitude": float(event_data.get("latitude", 0.0) if event_data.get("latitude") is not None else (event_data.get("lat") if event_data.get("lat") is not None else 0.0)),
                "longitude": float(event_data.get("longitude", 0.0) if event_data.get("longitude") is not None else (event_data.get("lon") if event_data.get("lon") is not None else 0.0)),
                "timestamp": event_data.get("timestamp", datetime.now(timezone.utc).isoformat())
            }
            asyncio.create_task(es_client.index(index="crowd_events", id=event_id, document=es_doc))
            logger.info(f"Indexed event {event_id} in Elasticsearch crowd_events")
        except Exception as e:
            logger.warning(f"Failed to index event {event_id} in Elasticsearch: {e}")

        # 1. Perception
        risk_assessment = await self.perception.analyze(event_data)
        await pubsub.publish(Channels.AGENT_PERCEPTION, {
            "event_id": event_id,
            "risk_assessment": risk_assessment,
        }, source="PerceptionAgent")

        # 2. Planning
        plan = await self.planning.plan(event_data, risk_assessment)
        await pubsub.publish(Channels.AGENT_PLANNING, {
            "event_id": event_id,
            "plan": plan,
        }, source="PlanningAgent")
        self._record_planning_decision(event_data, plan)

        if plan["action"] == "MONITOR":
            logger.info("--- Agent Workflow Ended (MONITOR ONLY) ---")
            await pubsub.publish(Channels.AGENT_PIPELINE, {
                "event_id": event_id,
                "stage": "COMPLETED",
                "result": "MONITOR",
            }, source="AgentManager")
            return {"risk_assessment": risk_assessment, "plan": plan}

        # 3. Inventory / Resource Allocation
        allocation = await self.inventory.allocate(plan, event_data.get("location", "unknown"))
        await pubsub.publish(Channels.AGENT_INVENTORY, {
            "event_id": event_id,
            "allocation": allocation,
        }, source="InventoryAgent")

        # 4. Validation
        validation = await self.validation.validate(plan, allocation)
        await pubsub.publish(Channels.AGENT_VALIDATION, {
            "event_id": event_id,
            "validation": validation,
        }, source="ValidationAgent")

        # 5. RAG Verification + self-correction loop
        verification, plan, allocation, validation = await self._verify_with_correction(
            event_id, event_data, risk_assessment, plan, allocation, validation
        )

        # 6. Human-in-the-loop gate for high-impact actions
        if settings.APPROVAL_REQUIRED and self._is_high_impact(plan):
            self._pending[event_id] = {
                "event_data": event_data,
                "risk_assessment": risk_assessment,
                "plan": plan,
                "allocation": allocation,
                "validation": validation,
                "verification": verification,
                "requested_at": datetime.now(timezone.utc).isoformat(),
            }
            logger.warning(f"⏸  Event {event_id} held for human approval ({plan['action']}).")
            await pubsub.publish(Channels.AGENT_EXECUTION, {
                "event_id": event_id,
                "execution": {"status": "PENDING_APPROVAL", "action": plan["action"]},
            }, source="ExecutionAgent")
            await pubsub.publish(Channels.AGENT_PIPELINE, {
                "event_id": event_id,
                "stage": "PENDING_APPROVAL",
                "action": plan["action"],
            }, source="AgentManager")
            return {
                "risk_assessment": risk_assessment,
                "plan": plan,
                "allocation": allocation,
                "validation": validation,
                "verification": verification,
                "execution": {"status": "PENDING_APPROVAL"},
            }

        # 7 + 8. Execute and run the commerce half
        result = await self._finalize(event_id, event_data, plan, validation)
        return {
            "risk_assessment": risk_assessment,
            "plan": plan,
            "allocation": allocation,
            "validation": validation,
            "verification": verification,
            **result,
        }

    async def _verify_with_correction(
        self,
        event_id: str,
        event_data: dict,
        risk_assessment: dict,
        plan: dict,
        allocation: dict,
        validation: dict,
    ):
        """RAG verification with self-correction loop (up to MAX_REPLANS).

        Returns (verification, final_plan, final_allocation, final_validation).
        """
        previous_correction: Optional[str] = None
        replans = 0

        while True:
            verification = await self.verification.verify(
                event_data, plan, allocation, previous_correction
            )
            
            if not settings.STRICT_RAG:
                verification["feasible"] = True
                verification["correction"] = ""
                verification["blocking"] = []
                logger.info("Strict RAG compliance disabled: bypassing constraint-driven self-correction.")

            await pubsub.publish(Channels.AGENT_VERIFICATION, {
                "event_id": event_id,
                "verification": verification,
                "replan_count": replans,
            }, source="VerificationAgent")

            if verification["feasible"] or replans >= MAX_REPLANS:
                if not verification["feasible"]:
                    logger.warning(
                        f"Proceeding despite infeasible plan after {replans} replan(s). "
                        "Constraint may be outdated or unavoidable."
                    )
                break

            # Self-correction: inject constraint context and re-plan
            replans += 1
            correction = verification["correction"]
            logger.info(f"Self-correcting plan (attempt {replans}): {correction}")

            # Inject the correction into the event context for re-planning
            corrected_event = dict(event_data, _constraint_correction=correction)
            rejected_plan = plan  # keep for the counterfactual display
            plan = await self.planning.plan(corrected_event, risk_assessment)
            plan["replan_count"] = replans
            previous_correction = correction

            await pubsub.publish(Channels.AGENT_PLANNING, {
                "event_id": event_id,
                "plan": plan,
                "self_correction": True,
                "correction_applied": correction,
                "rejected_plan": rejected_plan,
                "blocking_constraints": verification.get("blocking", []),
            }, source="PlanningAgent")
            self._record_planning_decision(event_data, plan)

            if plan["action"] == "MONITOR":
                # After re-plan, if the agent backs off to MONITOR, stop early
                break

            allocation = await self.inventory.allocate(plan, event_data.get("location", "unknown"))
            await pubsub.publish(Channels.AGENT_INVENTORY, {
                "event_id": event_id,
                "allocation": allocation,
                "self_correction": True,
            }, source="InventoryAgent")

            validation = await self.validation.validate(plan, allocation)
            await pubsub.publish(Channels.AGENT_VALIDATION, {
                "event_id": event_id,
                "validation": validation,
                "self_correction": True,
            }, source="ValidationAgent")

        return verification, plan, allocation, validation

    async def _finalize(self, event_id: str, event_data: dict, plan: dict, validation: dict) -> dict:
        """Run execution + marketing and publish completion. Shared by the
        auto path and the post-approval resume path."""
        # 7. Execution
        execution_result = await self.execution.execute(validation)
        await pubsub.publish(Channels.AGENT_EXECUTION, {
            "event_id": event_id,
            "execution": execution_result,
        }, source="ExecutionAgent")

        # 8. Marketing — autonomous flash deal tied to the same surge
        alloc = {"allocations": validation.get("approved_allocations", [])}
        deal = await self.marketing.run(event_data, plan, alloc)
        await pubsub.publish(Channels.AGENT_MARKETING, {
            "event_id": event_id,
            "deal": deal,
        }, source="MarketingAgent")

        # Fire-and-forget: supplier ACKs arrive 8-20s later (simulates B2B latency)
        restock_orders = execution_result.get("restock_orders", [])
        if restock_orders:
            asyncio.create_task(schedule_supplier_acks(restock_orders, event_id))

        logger.info("--- Agent Workflow Ended (EXECUTED) ---")
        await pubsub.publish(Channels.AGENT_PIPELINE, {
            "event_id": event_id,
            "stage": "COMPLETED",
            "result": execution_result.get("status", "UNKNOWN"),
        }, source="AgentManager")

        # LLM-judge scores the executed plan (fire-and-forget, config-gated).
        if settings.PLAN_EVAL_ENABLED:
            from ..observability.evaluator import evaluate_plan
            asyncio.create_task(evaluate_plan(event_id, event_data, plan))

        return {"execution": execution_result, "deal": deal}

    def list_pending(self) -> Dict[str, dict]:
        """Pending approvals (for the approvals REST endpoint)."""
        return self._pending

    async def resolve_approval(self, event_id: str, approved: bool) -> Optional[dict]:
        """Resume or cancel a pipeline that was held for human approval."""
        ctx = self._pending.pop(event_id, None)
        if ctx is None:
            return None

        if not approved:
            logger.warning(f"🚫 Event {event_id} REJECTED by human operator.")
            rejected = {"status": "REJECTED"}
            await pubsub.publish(Channels.AGENT_EXECUTION, {
                "event_id": event_id,
                "execution": rejected,
            }, source="ExecutionAgent")
            await pubsub.publish(Channels.AGENT_PIPELINE, {
                "event_id": event_id,
                "stage": "COMPLETED",
                "result": "REJECTED",
            }, source="AgentManager")
            return rejected

        logger.info(f"✅ Event {event_id} APPROVED by human operator — executing.")
        result = await self._finalize(event_id, ctx["event_data"], ctx["plan"], ctx["validation"])
        return result["execution"]


agent_manager = AgentManager()
