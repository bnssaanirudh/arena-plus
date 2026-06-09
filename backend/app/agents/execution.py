"""
Execution Agent
=================
Executes approved allocations by updating inventory via MCP.
Supports DRY_RUN mode for testing without side effects.
Logs all execution decisions to the pub/sub system.
"""

import json
import uuid
from datetime import datetime, timezone
from loguru import logger

from ..config import settings
from ..mcp.tools import MCPTools
from ..infra.mock_redis import mock_redis

# Which supplier refills which item (B2B restock routing).
_SUPPLIER_BY_ITEM = {
    "water": "AquaFlow Distribution",
    "food": "StadiumEats Logistics",
}


def _build_restock_orders(allocations: list) -> list:
    """Turn dispatched allocations into structured B2B restock orders.

    Each unit dispatched depletes a vendor, so we draft a replenishment order
    per (vendor, item) back to the responsible supplier. (project_idea.md —
    Action B: autonomous B2B restocking.)
    """
    orders = []
    for alloc in allocations:
        for item, qty in (("water", alloc.get("take_water", 0)), ("food", alloc.get("take_food", 0))):
            if qty and qty > 0:
                orders.append({
                    "order_id": f"PO-{uuid.uuid4().hex[:8].upper()}",
                    "vendor_id": alloc["vendor_id"],
                    "vendor_name": alloc.get("vendor_name", alloc["vendor_id"]),
                    "item": item,
                    "quantity": int(qty),
                    "supplier": _SUPPLIER_BY_ITEM.get(item, "General Supply Co."),
                    "status": "ORDERED",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                })
    return orders


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

        restock_orders = _build_restock_orders(validation["approved_allocations"])
        return {
            "status": "DRY_RUN",
            "planned_allocations": dry_results,
            "restock_orders": restock_orders,
        }

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

        restock_orders = _build_restock_orders(executed)
        for order in restock_orders:
            await MCPTools.record_agent_action(
                agent_name="ExecutionAgent",
                action=f"Restock order {order['order_id']}: {order['quantity']} {order['item']} "
                       f"for {order['vendor_name']} from {order['supplier']}",
                reasoning="Replenish stock depleted by dispatch",
            )

        return {
            "status": "EXECUTED",
            "executed_allocations": executed,
            "restock_orders": restock_orders,
        }

    async def _log_decision(self, action: str, detail: str):
        """Log execution decisions to the mock Redis store."""
        log_entry = json.dumps({
            "agent": "ExecutionAgent",
            "action": action,
            "detail": detail,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        await mock_redis.lpush("execution_log", log_entry)
