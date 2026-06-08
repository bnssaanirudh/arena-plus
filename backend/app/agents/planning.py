from loguru import logger
import json

class PlanningAgent:
    """
    Planning Agent
    Role: Based on risk assessment, decide if intervention is needed and what resources are required.
    """
    async def plan(self, event_data: dict, risk_assessment: dict) -> dict:
        logger.info("PlanningAgent formulating plan")
        
        risk = risk_assessment.get("risk_level", "LOW")
        
        if risk in ["CRITICAL", "HIGH"]:
            plan_action = "DISPATCH_RESOURCES"
            water_needed = int(event_data.get("predicted_people", 0) * 0.1)  # 10% need water
            food_needed = int(event_data.get("predicted_people", 0) * 0.05)  # 5% need food
        else:
            plan_action = "MONITOR"
            water_needed = 0
            food_needed = 0
            
        return {
            "action": plan_action,
            "resources_required": {
                "water": water_needed,
                "food": food_needed
            },
            "reasoning": f"Risk is {risk}, dispatching resources accordingly."
        }
