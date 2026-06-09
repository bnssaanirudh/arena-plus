"""
Tests for the Execution Agent's B2B restock + supplier-acknowledgement loop
============================================================================
Covers `_build_restock_orders` (order generation) and `schedule_supplier_acks`
(the async supplier-ack simulation). The 8-20 s sleep is patched out so the
tests run instantly.
"""

import sys
import json
import pytest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class TestBuildRestockOrders:
    """Tests for _build_restock_orders."""

    def test_builds_one_order_per_item_with_positive_qty(self):
        from app.agents.execution import _build_restock_orders

        allocations = [
            {"vendor_id": "v1", "vendor_name": "Vendor One", "take_water": 100, "take_food": 50},
        ]
        orders = _build_restock_orders(allocations)
        assert len(orders) == 2
        items = {o["item"] for o in orders}
        assert items == {"water", "food"}
        for o in orders:
            assert o["order_id"].startswith("PO-")
            assert o["status"] == "ORDERED"
            assert o["quantity"] > 0
            assert o["supplier"]  # non-empty supplier routing

    def test_skips_zero_quantity_items(self):
        from app.agents.execution import _build_restock_orders

        allocations = [
            {"vendor_id": "v1", "vendor_name": "V1", "take_water": 0, "take_food": 30},
        ]
        orders = _build_restock_orders(allocations)
        assert len(orders) == 1
        assert orders[0]["item"] == "food"

    def test_empty_allocations_yields_no_orders(self):
        from app.agents.execution import _build_restock_orders
        assert _build_restock_orders([]) == []

    def test_supplier_routing_by_item(self):
        from app.agents.execution import _build_restock_orders, _SUPPLIER_BY_ITEM

        allocations = [{"vendor_id": "v1", "take_water": 10, "take_food": 10}]
        orders = _build_restock_orders(allocations)
        by_item = {o["item"]: o["supplier"] for o in orders}
        assert by_item["water"] == _SUPPLIER_BY_ITEM["water"]
        assert by_item["food"] == _SUPPLIER_BY_ITEM["food"]


class TestScheduleSupplierAcks:
    """Tests for schedule_supplier_acks (the async supplier ack loop)."""

    @pytest.mark.asyncio
    async def test_empty_orders_publishes_nothing(self, monkeypatch):
        from app.agents import execution
        from app.infra.pubsub import pubsub

        published = []
        async def fake_publish(channel, data):
            published.append((channel, data))
        monkeypatch.setattr(pubsub, "publish", fake_publish)

        await execution.schedule_supplier_acks([], "evt-1")
        assert published == []

    @pytest.mark.asyncio
    async def test_publishes_ack_for_each_order(self, monkeypatch):
        from app.agents import execution
        from app.infra.pubsub import pubsub, Channels

        # Patch out the 8-20 s delay so the test is instant
        async def instant_sleep(_):
            return None
        monkeypatch.setattr(execution.asyncio, "sleep", instant_sleep)

        published = []
        async def fake_publish(channel, data):
            published.append((channel, data))
        monkeypatch.setattr(pubsub, "publish", fake_publish)

        orders = [
            {"order_id": "PO-AAA", "item": "water"},
            {"order_id": "PO-BBB", "item": "food"},
        ]
        await execution.schedule_supplier_acks(orders, "evt-42")

        assert len(published) == 1
        channel, data = published[0]
        assert channel == Channels.AGENT_RESTOCK_ACK
        assert data["event_id"] == "evt-42"
        assert len(data["acks"]) == 2
        ack_ids = {a["order_id"] for a in data["acks"]}
        assert ack_ids == {"PO-AAA", "PO-BBB"}
        for ack in data["acks"]:
            assert ack["status"] == "ACKNOWLEDGED"
            assert ack["ack_at"]
        # serializable for the WS layer
        json.dumps(data)
