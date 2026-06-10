"""
Live analytics over Elasticsearch ES|QL  (Elastic partner-track showcase)
==========================================================================
Every chart on the Global Analytics page is fed by a real ES|QL query against
the live indices (crowd_events, agent_decisions, vendors). The raw ES|QL text
is returned alongside each dataset so the UI can show judges exactly what ran.

Graceful degradation: any query failure flips that dataset to a static mock
and tags it ``source: "mock"`` — the page renders either way.
"""

from typing import Any, Dict, List

from fastapi import APIRouter
from loguru import logger

router = APIRouter()

# ── ES|QL queries (shown verbatim in the UI) ─────────────────────────────────
_Q_ZONE_DENSITY = (
    "FROM crowd_events "
    "| STATS avg_density = AVG(density_score), events = COUNT(*), "
    "peak_people = MAX(predicted_people) BY location "
    "| SORT events DESC"
)
_Q_AGENT_OPS = (
    "FROM agent_decisions "
    "| STATS decisions = COUNT(*) BY agent_name "
    "| SORT decisions DESC"
)
_Q_VENDOR_STOCK = (
    "FROM vendors "
    "| KEEP vendor_name, inventory_water, inventory_food, inventory_merchandise "
    "| SORT vendor_name ASC "
    "| LIMIT 12"
)

# ── Static fallbacks (page renders even with ES down) ───────────────────────
_MOCK_ZONES = [
    {"location": "South Gate", "avg_density": 7.2, "events": 14, "peak_people": 11000},
    {"location": "North Gate", "avg_density": 5.1, "events": 9, "peak_people": 6200},
    {"location": "West Gate", "avg_density": 6.4, "events": 7, "peak_people": 6000},
    {"location": "Food Court", "avg_density": 4.8, "events": 6, "peak_people": 3800},
    {"location": "East Gate", "avg_density": 3.2, "events": 4, "peak_people": 2100},
]
_MOCK_OPS = [
    {"agent_name": "ExecutionAgent", "decisions": 42},
    {"agent_name": "PlanningAgent", "decisions": 28},
]
_MOCK_STOCK = [
    {"vendor_name": "Gate A Snacks", "inventory_water": 95, "inventory_food": 88, "inventory_merchandise": 40},
    {"vendor_name": "North Stand Concessions", "inventory_water": 42, "inventory_food": 35, "inventory_merchandise": 78},
    {"vendor_name": "South Concourse E", "inventory_water": 80, "inventory_food": 92, "inventory_merchandise": 65},
    {"vendor_name": "Zone 4 Beer & Soda", "inventory_water": 22, "inventory_food": 15, "inventory_merchandise": 12},
    {"vendor_name": "VIP Lounge Dining", "inventory_water": 85, "inventory_food": 70, "inventory_merchandise": 90},
    {"vendor_name": "East Plaza Kiosk", "inventory_water": 65, "inventory_food": 50, "inventory_merchandise": 30},
]


async def _run_esql(query: str) -> List[Dict[str, Any]]:
    """Run one ES|QL query, return rows as list of dicts. Raises on failure."""
    from ..elastic.client import es_client

    res = await es_client.esql.query(query=query)
    body = res.body if hasattr(res, "body") else res
    columns = [c["name"] for c in body.get("columns", [])]
    return [dict(zip(columns, row)) for row in body.get("values", [])]


def _dataset(rows: List[Dict[str, Any]], query: str, mock: List[Dict[str, Any]]) -> Dict[str, Any]:
    if rows:
        return {"source": "esql", "query": query, "rows": rows}
    return {"source": "mock", "query": query, "rows": mock}


@router.get("/summary")
async def analytics_summary() -> Dict[str, Any]:
    """All three Global Analytics datasets, each from a live ES|QL query."""
    out: Dict[str, Any] = {}

    for key, query, mock in (
        ("zone_density", _Q_ZONE_DENSITY, _MOCK_ZONES),
        ("agent_ops", _Q_AGENT_OPS, _MOCK_OPS),
        ("vendor_stock", _Q_VENDOR_STOCK, _MOCK_STOCK),
    ):
        try:
            rows = await _run_esql(query)
            out[key] = _dataset(rows, query, mock)
        except Exception as e:
            logger.warning(f"ES|QL query '{key}' failed — serving mock: {e}")
            out[key] = {"source": "mock", "query": query, "rows": mock}

    live = sum(1 for v in out.values() if v["source"] == "esql")
    out["meta"] = {"live_datasets": live, "total_datasets": 3}
    return out
