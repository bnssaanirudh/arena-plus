import asyncio
from loguru import logger
from .perception import PerceptionAgent
from .planning import PlanningAgent
from .inventory import InventoryAgent
from .validation import ValidationAgent
from .execution import ExecutionAgent

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
        Event -> Perception -> Planning -> Inventory -> Validation -> Execution
        """
        logger.info(f"--- Agent Workflow Started for Event {event_data['event_id']} ---")
        
        # 1. Perception
        risk_assessment = await self.perception.analyze(event_data)
        
        # 2. Planning
        plan = await self.planning.plan(event_data, risk_assessment)
        
        if plan["action"] == "MONITOR":
            logger.info("--- Agent Workflow Ended (MONITOR ONLY) ---")
            return {
                "risk_assessment": risk_assessment,
                "plan": plan
            }
            
        # 3. Inventory / Resource Allocation
        allocation = await self.inventory.allocate(plan, event_data["location"])
        
        # 4. Validation
        validation = await self.validation.validate(plan, allocation)
        
        # 5. Execution
        execution_result = await self.execution.execute(validation)
        
        logger.info("--- Agent Workflow Ended (EXECUTED) ---")
        return {
            "risk_assessment": risk_assessment,
            "plan": plan,
            "allocation": allocation,
            "validation": validation,
            "execution": execution_result
        }

agent_manager = AgentManager()
