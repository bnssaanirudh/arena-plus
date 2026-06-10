from elasticsearch import AsyncElasticsearch
from loguru import logger
import os
from dotenv import load_dotenv

load_dotenv()

ELASTICSEARCH_URL = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
ELASTIC_API_KEY = os.getenv("ELASTIC_API_KEY")

es_client = AsyncElasticsearch(
    ELASTICSEARCH_URL,
    api_key=ELASTIC_API_KEY,
    verify_certs=True,
    request_timeout=30.0
)

async def check_connection() -> bool:
    try:
        info = await es_client.info()
        logger.info(f"Connected to Elasticsearch cluster: {info['cluster_name']}")
        return True
    except Exception as e:
        logger.warning(f"Could not connect to Elasticsearch at {ELASTICSEARCH_URL}: {e}")
        return False
