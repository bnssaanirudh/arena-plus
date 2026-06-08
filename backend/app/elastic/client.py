from elasticsearch import AsyncElasticsearch
from loguru import logger
import os

# Assume ES running locally on 9200
ELASTIC_URL = os.getenv("ELASTIC_URL", "http://localhost:9200")

es_client = AsyncElasticsearch(
    ELASTIC_URL,
    verify_certs=False,
    request_timeout=30.0
)

async def check_connection() -> bool:
    try:
        info = await es_client.info()
        logger.info(f"Connected to Elasticsearch cluster: {info['cluster_name']}")
        return True
    except Exception as e:
        logger.warning(f"Could not connect to Elasticsearch at {ELASTIC_URL}: {e}")
        return False
