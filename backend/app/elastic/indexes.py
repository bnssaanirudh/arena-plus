from .client import es_client
from loguru import logger

INDEXES = {
    "vendors": {
        "mappings": {
            "properties": {
                "vendor_id": {"type": "keyword"},
                "vendor_name": {"type": "text"},
                "location": {"type": "geo_point"},
                "inventory_water": {"type": "integer"},
                "inventory_food": {"type": "integer"},
                "inventory_merchandise": {"type": "integer"}
            }
        }
    },
    "stadium_zones": {
        "mappings": {
            "properties": {
                "zone_name": {"type": "keyword"},
                "capacity": {"type": "integer"},
                "current_attendance": {"type": "integer"}
            }
        }
    },
    "crowd_events": {
        "mappings": {
            "properties": {
                "event_id": {"type": "keyword"},
                "event_type": {"type": "keyword"},
                "location": {"type": "keyword"},
                "density_score": {"type": "float"},
                "predicted_people": {"type": "integer"},
                "timestamp": {"type": "date"}
            }
        }
    },
    "agent_decisions": {
        "mappings": {
            "properties": {
                "decision_id": {"type": "keyword"},
                "agent_name": {"type": "keyword"},
                "action": {"type": "text"},
                "reasoning": {"type": "text"},
                "timestamp": {"type": "date"}
            }
        }
    }
}

async def setup_indexes():
    for index_name, body in INDEXES.items():
        exists = await es_client.indices.exists(index=index_name)
        if not exists:
            await es_client.indices.create(index=index_name, body=body)
            logger.info(f"Created index: {index_name}")
        else:
            logger.info(f"Index {index_name} already exists")
