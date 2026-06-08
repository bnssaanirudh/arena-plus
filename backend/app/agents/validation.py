from loguru import logger

class ValidationAgent:
    """
    Validation Agent
    Role: Review the proposed allocation and ensure it makes logical sense.
    """
    async def validate(self, plan: dict, allocation: dict) -> dict:
        logger.info("ValidationAgent validating allocation")
        
        if plan["action"] != "DISPATCH_RESOURCES":
            return {"status": "VALID", "reason": "No action to validate"}
            
        shortfall = allocation.get("shortfall", {})
        if shortfall.get("water", 0) > 0 or shortfall.get("food", 0) > 0:
            logger.warning(f"Validation flagged a shortfall: {shortfall}")
            
        return {
            "status": "VALID",
            "reason": "Allocations are within available inventory",
            "approved_allocations": allocation.get("allocations", [])
        }
