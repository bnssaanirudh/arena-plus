from typing import List, Dict, Any
from ..elastic.client import es_client
from loguru import logger
import uuid
from datetime import datetime, timezone

class MCPTools:
    """
    Model Context Protocol (MCP) Tools.
    These are exposed to the AI Agents for semantic memory and environment interaction.
    """
    
    @staticmethod
    async def query_local_inventory(vendor_id: str) -> Dict[str, Any]:
        try:
            res = await es_client.get(index="vendors", id=vendor_id)
            return res["_source"]
        except Exception as e:
            logger.error(f"Error querying inventory: {e}")
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
                            "location": {
                                "lat": lat,
                                "lon": lon
                            }
                        }
                    }
                }
            }
        }
        try:
            res = await es_client.search(index="vendors", body=query)
            return [hit["_source"] for hit in res["hits"]["hits"]]
        except Exception as e:
            logger.error(f"Error finding nearest vendor: {e}")
            return []

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
            return True
        except Exception as e:
            logger.error(f"Error updating inventory: {e}")
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
