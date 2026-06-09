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
        water_short = shortfall.get("water", 0)
        food_short = shortfall.get("food", 0)

        if water_short > 0 or food_short > 0:
            logger.warning(f"ValidationAgent rejected allocation — shortfall: {shortfall}")
            return {
                "status": "INVALID",
                "reason": f"Insufficient inventory — water short: {water_short}, food short: {food_short}",
                "approved_allocations": allocation.get("allocations", []),
                "shortfall": shortfall,
            }

        return {
            "status": "VALID",
            "reason": "Allocations are within available inventory",
            "approved_allocations": allocation.get("allocations", []),
        }
