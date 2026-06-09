import math
from typing import List, Dict, Any
from ..elastic.client import es_client
from ..elastic.client import check_connection
from ..simulator.vendors import get_all_vendors
from loguru import logger
import uuid
from datetime import datetime, timezone

# In-memory vendor index keyed by vendor_id for O(1) lookup
_VENDOR_CACHE: Dict[str, Dict[str, Any]] = {}


def _get_vendor_cache() -> Dict[str, Dict[str, Any]]:
    global _VENDOR_CACHE
    if not _VENDOR_CACHE:
        _VENDOR_CACHE = {v["vendor_id"]: v for v in get_all_vendors()}
    return _VENDOR_CACHE


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Approximate distance in metres between two lat/lon points."""
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _parse_distance_m(distance: str) -> float:
    """Parse an ES distance string like '500m' or '1km' to metres."""
    distance = distance.strip().lower()
    if distance.endswith("km"):
        return float(distance[:-2]) * 1000
    if distance.endswith("m"):
        return float(distance[:-1])
    return float(distance)


def _fallback_nearest_vendor(lat: float, lon: float, distance: str) -> List[Dict[str, Any]]:
    """In-memory geo-filter over VENDORS_DB — used when ES is unavailable."""
    max_m = _parse_distance_m(distance)
    results = []
    for vendor in _get_vendor_cache().values():
        d = _haversine_m(lat, lon, vendor["latitude"], vendor["longitude"])
        if d <= max_m:
            results.append(vendor)
    return results


class MCPTools:
    """
    Model Context Protocol (MCP) Tools.
    These are exposed to the AI Agents for semantic memory and environment interaction.
    ES-backed operations fall back to the in-memory vendor DB when ES is unavailable,
    preserving the zero-external-deps property.
    """

    @staticmethod
    async def query_local_inventory(vendor_id: str) -> Dict[str, Any]:
        try:
            res = await es_client.get(index="vendors", id=vendor_id)
            return res["_source"]
        except Exception:
            # Fall back to in-memory store
            vendor = _get_vendor_cache().get(vendor_id)
            if vendor:
                return vendor
            logger.warning(f"Vendor {vendor_id} not found in ES or in-memory cache")
            return {"error": "Vendor not found"}

    @staticmethod
    async def find_nearest_vendor(lat: float, lon: float, distance: str = "500m") -> List[Dict[str, Any]]:
        query = {
            "query": {
                "bool": {
                    "must": {"match_all": {}},
                    "filter": {
                        "geo_distance": {
                            "distance": distance,
                            "location": {"lat": lat, "lon": lon}
                        }
                    }
                }
            }
        }
        try:
            res = await es_client.search(index="vendors", body=query)
            hits = [hit["_source"] for hit in res["hits"]["hits"]]
            if hits:
                return hits
            # ES up but index empty — fall through to in-memory
        except Exception:
            pass

        logger.debug(f"ES unavailable or empty — using in-memory vendor geo-filter ({distance})")
        return _fallback_nearest_vendor(lat, lon, distance)

    @staticmethod
    async def find_overloaded_zone(threshold: float = 8.0) -> List[Dict[str, Any]]:
        query = {
            "query": {
                "range": {
                    "density_score": {
                        "gte": threshold
                    }
                }
            },
            "sort": [{"timestamp": {"order": "desc"}}],
            "size": 5
        }
        try:
            res = await es_client.search(index="crowd_events", body=query)
            return [hit["_source"] for hit in res["hits"]["hits"]]
        except Exception as e:
            return []

    @staticmethod
    async def get_recent_surges(minutes_ago: int = 15) -> List[Dict[str, Any]]:
        query = {
            "query": {
                "bool": {
                    "must": [
                        {"match": {"event_type": "crowd_surge"}}
                    ],
                    "filter": [
                        {"range": {"timestamp": {"gte": f"now-{minutes_ago}m"}}}
                    ]
                }
            },
            "sort": [{"timestamp": {"order": "desc"}}]
        }
        try:
            res = await es_client.search(index="crowd_events", body=query)
            return [hit["_source"] for hit in res["hits"]["hits"]]
        except Exception as e:
            return []

    @staticmethod
    async def update_vendor_inventory(vendor_id: str, water: int = None, food: int = None, merch: int = None) -> bool:
        doc = {}
        if water is not None: doc["inventory_water"] = water
        if food is not None: doc["inventory_food"] = food
        if merch is not None: doc["inventory_merchandise"] = merch

        if not doc:
            return False

        try:
            await es_client.update(index="vendors", id=vendor_id, body={"doc": doc})
        except Exception:
            pass  # best-effort ES update

        # Always update the in-memory cache so subsequent allocations see current stock
        cache = _get_vendor_cache()
        if vendor_id in cache:
            cache[vendor_id].update(doc)
            return True

        logger.warning(f"Vendor {vendor_id} not found in in-memory cache for inventory update")
        return False

    @staticmethod
    async def record_agent_action(agent_name: str, action: str, reasoning: str) -> str:
        doc = {
            "decision_id": str(uuid.uuid4()),
            "agent_name": agent_name,
            "action": action,
            "reasoning": reasoning,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        try:
            await es_client.index(index="agent_decisions", document=doc)
            return doc["decision_id"]
        except Exception as e:
            logger.error(f"Error recording agent action: {e}")
            return ""
