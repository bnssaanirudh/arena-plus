from loguru import logger
from ..mcp.tools import MCPTools

class InventoryAgent:
    """
    Inventory / Resource Allocation Agent
    Role: Find nearest vendors and allocate the required resources.
    """
    async def allocate(self, plan: dict, location: str) -> dict:
        logger.info("InventoryAgent allocating resources")
        
        if plan["action"] != "DISPATCH_RESOURCES":
            return {"status": "NO_ACTION_NEEDED", "allocations": []}
            
        # We need a lat/lon for the zone. We'll use a dummy center since location is just a string
        # In a real scenario, we'd lookup the zone coordinates
        lat, lon = 34.0141, -118.2879
        
        vendors = await MCPTools.find_nearest_vendor(lat, lon, "1km")
        allocations = []
        
        water_needed = plan["resources_required"]["water"]
        food_needed = plan["resources_required"]["food"]
        
        for vendor in vendors:
            if water_needed <= 0 and food_needed <= 0:
                break
                
            take_water = min(water_needed, vendor.get("inventory_water", 0))
            take_food = min(food_needed, vendor.get("inventory_food", 0))
            
            if take_water > 0 or take_food > 0:
                allocations.append({
                    "vendor_id": vendor["vendor_id"],
                    "vendor_name": vendor["vendor_name"],
                    "take_water": take_water,
                    "take_food": take_food
                })
                water_needed -= take_water
                food_needed -= take_food
                
        return {
            "status": "ALLOCATED",
            "allocations": allocations,
            "shortfall": {
                "water": water_needed,
                "food": food_needed
            }
        }
