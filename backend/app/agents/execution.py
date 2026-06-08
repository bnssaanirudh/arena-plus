"""
Execution Agent
=================
Executes approved allocations by updating inventory via MCP.
Supports DRY_RUN mode for testing without side effects.
Logs all execution decisions to the pub/sub system.
"""

import json
from datetime import datetime, timezone
from loguru import logger

from ..config import settings
from ..mcp.tools import MCPTools
from ..infra.mock_redis import mock_redis


class ExecutionAgent:
    """
    Execution Agent
    Role: Execute the approved allocations by updating ElasticSearch inventory via MCP.
    """

    async def execute(self, validation: dict) -> dict:
        logger.info("ExecutionAgent executing approved allocations")

        if validation["status"] != "VALID" or not validation.get("approved_allocations"):
            await self._log_decision("NO_EXECUTION", "No valid allocations to execute")
            return {"status": "NO_EXECUTION"}

        if settings.DRY_RUN:
            logger.info("🔒 DRY_RUN mode – logging allocations without executing")
            return await self._dry_run(validation)

        return await self._live_execute(validation)

    async def _dry_run(self, validation: dict) -> dict:
        """Log what would be executed without making changes."""
        dry_results = []
        for alloc in validation["approved_allocations"]:
            entry = {
                "vendor_id": alloc["vendor_id"],
                "take_water": alloc["take_water"],
                "take_food": alloc["take_food"],
                "mode": "DRY_RUN",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            dry_results.append(entry)
            logger.info(f"  [DRY_RUN] Would dispatch {alloc['take_water']} water, "
                        f"{alloc['take_food']} food from {alloc['vendor_id']}")

            await self._log_decision(
                "DRY_RUN_DISPATCH",
                f"Would dispatch {alloc['take_water']} water and "
                f"{alloc['take_food']} food from {alloc['vendor_id']}"
            )

        return {"status": "DRY_RUN", "planned_allocations": dry_results}

    async def _live_execute(self, validation: dict) -> dict:
        """Actually execute the allocations."""
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
                    action=f"Dispatched {alloc['take_water']} water and "
                           f"{alloc['take_food']} food from {vendor_id}",
                    reasoning="Approved allocation"
                )
                await self._log_decision(
                    "EXECUTED",
                    f"Dispatched {alloc['take_water']} water and "
                    f"{alloc['take_food']} food from {vendor_id}"
                )

        return {"status": "EXECUTED", "executed_allocations": executed}

    async def _log_decision(self, action: str, detail: str):
        """Log execution decisions to the mock Redis store."""
        log_entry = json.dumps({
            "agent": "ExecutionAgent",
            "action": action,
            "detail": detail,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        await mock_redis.lpush("execution_log", log_entry)
