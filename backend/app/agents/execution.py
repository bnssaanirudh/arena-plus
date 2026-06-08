from loguru import logger
from ..mcp.tools import MCPTools

class ExecutionAgent:
    """
    Execution Agent
    Role: Execute the approved allocations by updating ElasticSearch inventory via MCP.
    """
    async def execute(self, validation: dict) -> dict:
        logger.info("ExecutionAgent executing approved allocations")
        
        if validation["status"] != "VALID" or not validation.get("approved_allocations"):
            return {"status": "NO_EXECUTION"}
            
        executed = []
        for alloc in validation["approved_allocations"]:
            vendor_id = alloc["vendor_id"]
            
            # Get current inventory
            vendor_data = await MCPTools.query_local_inventory(vendor_id)
            if "error" in vendor_data:
                continue
                
            new_water = vendor_data.get("inventory_water", 0) - alloc["take_water"]
            new_food = vendor_data.get("inventory_food", 0) - alloc["take_food"]
            
            success = await MCPTools.update_vendor_inventory(
                vendor_id=vendor_id,
                water=new_water,
                food=new_food
            )
            
            if success:
                executed.append(alloc)
                await MCPTools.record_agent_action(
                    agent_name="ExecutionAgent",
                    action=f"Dispatched {alloc['take_water']} water and {alloc['take_food']} food from {vendor_id}",
                    reasoning="Approved allocation"
                )
                
        return {"status": "EXECUTED", "executed_allocations": executed}
