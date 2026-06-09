"""
Agent Manager
===============
Orchestrates the multi-agent pipeline:
  Event → Perception → Planning → Inventory → Validation → Execution

Publishes intermediate state to pub/sub channels at each stage so the
frontend dashboard can display real-time agent activity.
"""

import asyncio
from loguru import logger

from .perception import PerceptionAgent
from .planning import PlanningAgent
from .inventory import InventoryAgent
from .validation import ValidationAgent
from .execution import ExecutionAgent
from ..infra.pubsub import pubsub, Channels


class AgentManager:
    def __init__(self):
        self.perception = PerceptionAgent()
        self.planning = PlanningAgent()
        self.inventory = InventoryAgent()
        self.validation = ValidationAgent()
        self.execution = ExecutionAgent()

    async def process_event(self, event_data: dict) -> dict:
        """
        State Machine for Processing an Event:
        Event → Perception → Planning → Inventory → Validation → Execution

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

        # 5. Execution
        execution_result = await self.execution.execute(validation)
        await pubsub.publish(Channels.AGENT_EXECUTION, {
            "event_id": event_id,
            "execution": execution_result,
        }, source="ExecutionAgent")

        logger.info("--- Agent Workflow Ended (EXECUTED) ---")
        await pubsub.publish(Channels.AGENT_PIPELINE, {
            "event_id": event_id,
            "stage": "COMPLETED",
            "result": execution_result.get("status", "UNKNOWN"),
        }, source="AgentManager")

        return {
            "risk_assessment": risk_assessment,
            "plan": plan,
            "allocation": allocation,
            "validation": validation,
            "execution": execution_result,
        }


agent_manager = AgentManager()
