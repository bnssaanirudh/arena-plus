"""
Agent Manager
===============
Orchestrates the multi-agent pipeline:
  Event → Perception → Planning → Inventory → Validation
        → [human approval gate] → Execution → Marketing

Publishes intermediate state to pub/sub channels at each stage so the
frontend dashboard can display real-time agent activity.

Human-in-the-loop: when ``APPROVAL_REQUIRED`` is set and a plan is high-impact
(EVACUATE_ZONE or a large dispatch), the pipeline pauses at PENDING_APPROVAL and
waits for ``resolve_approval()`` (driven by the approvals REST endpoint) before
executing — the "you stay in control" guarantee.
"""

from datetime import datetime, timezone
from typing import Dict, Optional

from loguru import logger

from ..config import settings
from .perception import PerceptionAgent
from .planning import PlanningAgent
from .inventory import InventoryAgent
from .validation import ValidationAgent
from .execution import ExecutionAgent
from .marketing import MarketingAgent
from ..infra.pubsub import pubsub, Channels


class AgentManager:
    def __init__(self):
        self.perception = PerceptionAgent()
        self.planning = PlanningAgent()
        self.inventory = InventoryAgent()
        self.validation = ValidationAgent()
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

    async def process_event(self, event_data: dict) -> dict:
        """
        State Machine for Processing an Event:
        Event → Perception → Planning → Inventory → Validation → (gate) → Execution → Marketing

        Publishes intermediate results to pub/sub at each stage.
        """
        event_id = event_data.get('event_id', 'unknown')
        logger.info(f"--- Agent Workflow Started for Event {event_id} ---")

        # Publish: pipeline started
        await pubsub.publish(Channels.AGENT_PIPELINE, {
            "event_id": event_id,
            "stage": "STARTED",
            "event_data": event_data,
        }, source="AgentManager")

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

        if plan["action"] == "MONITOR":
            logger.info("--- Agent Workflow Ended (MONITOR ONLY) ---")
            await pubsub.publish(Channels.AGENT_PIPELINE, {
                "event_id": event_id,
                "stage": "COMPLETED",
                "result": "MONITOR",
            }, source="AgentManager")

            return {
                "risk_assessment": risk_assessment,
                "plan": plan,
            }

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

        # 4b. Human-in-the-loop gate for high-impact actions
        if settings.APPROVAL_REQUIRED and self._is_high_impact(plan):
            self._pending[event_id] = {
                "event_data": event_data,
                "risk_assessment": risk_assessment,
                "plan": plan,
                "allocation": allocation,
                "validation": validation,
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
                "execution": {"status": "PENDING_APPROVAL"},
            }

        # 5 + 6. Execute and run the commerce half
        result = await self._finalize(event_id, event_data, plan, validation)
        return {
            "risk_assessment": risk_assessment,
            "plan": plan,
            "allocation": allocation,
            "validation": validation,
            **result,
        }

    async def _finalize(self, event_id: str, event_data: dict, plan: dict, validation: dict) -> dict:
        """Run execution + marketing and publish completion. Shared by the
        auto path and the post-approval resume path."""
        # 5. Execution
        execution_result = await self.execution.execute(validation)
        await pubsub.publish(Channels.AGENT_EXECUTION, {
            "event_id": event_id,
            "execution": execution_result,
        }, source="ExecutionAgent")

        # 6. Marketing — autonomous flash deal tied to the same surge
        allocation = {"allocations": validation.get("approved_allocations", [])}
        deal = await self.marketing.run(event_data, plan, allocation)
        await pubsub.publish(Channels.AGENT_MARKETING, {
            "event_id": event_id,
            "deal": deal,
        }, source="MarketingAgent")

        logger.info("--- Agent Workflow Ended (EXECUTED) ---")
        await pubsub.publish(Channels.AGENT_PIPELINE, {
            "event_id": event_id,
            "stage": "COMPLETED",
            "result": execution_result.get("status", "UNKNOWN"),
        }, source="AgentManager")

        return {"execution": execution_result, "deal": deal}

    def list_pending(self) -> Dict[str, dict]:
        """Pending approvals (for the approvals REST endpoint)."""
        return self._pending

    async def resolve_approval(self, event_id: str, approved: bool) -> Optional[dict]:
        """Resume or cancel a pipeline that was held for human approval.

        Returns the execution result dict, ``{"status": "REJECTED"}`` if denied,
        or ``None`` if there is no such pending event.
        """
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
