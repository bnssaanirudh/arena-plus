from .client import es_client
from ..simulator.vendors import get_all_vendors
from loguru import logger

async def ingest_vendors():
    vendors = get_all_vendors()
    operations = []
    for vendor in vendors:
        operations.append({
            "index": {"_index": "vendors", "_id": vendor["vendor_id"]}
        })
        # Format location for ElasticSearch geo_point
        doc = vendor.copy()
        doc["location"] = {"lat": doc.pop("latitude"), "lon": doc.pop("longitude")}
        operations.append(doc)
        
    try:
        if operations:
            res = await es_client.bulk(operations=operations)
            if res.get("errors"):
                logger.error("Errors occurred during vendor ingestion")
            else:
                logger.info(f"Successfully ingested {len(vendors)} vendors")
    except Exception as e:
        logger.error(f"Failed to bulk ingest vendors: {e}")

async def run_initial_ingestion():
    await ingest_vendors()
