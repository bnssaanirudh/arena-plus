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

async def ingest_constraints():
    from ..agents.verification import _CONSTRAINTS
    from ..llm import gemini

    # Embed all descriptions in one batched call — enables kNN retrieval.
    # On failure (Gemini unconfigured / quota), ingest without vectors; BM25 still works.
    vectors = await gemini.embed_texts(
        [f"{c['zone']} {c['type']}: {c['description']}" for c in _CONSTRAINTS]
    )
    if vectors:
        logger.info(f"Embedded {len(vectors)} supply constraints for semantic (kNN) retrieval")
    else:
        logger.info("Constraint embeddings unavailable — BM25-only retrieval")

    operations = []
    for i, constraint in enumerate(_CONSTRAINTS):
        operations.append({
            "index": {"_index": "supply_constraints", "_id": constraint["id"]}
        })
        doc = constraint.copy()
        if vectors:
            doc["embedding"] = vectors[i]
        operations.append(doc)
        
    try:
        if operations:
            res = await es_client.bulk(operations=operations)
            if res.get("errors"):
                logger.error("Errors occurred during supply constraints ingestion")
            else:
                logger.info(f"Successfully ingested {len(_CONSTRAINTS)} supply constraints")
    except Exception as e:
        logger.error(f"Failed to bulk ingest supply constraints: {e}")

async def ingest_stadium_zones():
    from ..simulator.events import ZONES
    ZONE_CAPACITIES = {
        "North Gate": 15000,
        "South Gate": 15000,
        "East Gate": 12000,
        "West Gate": 12000,
        "Food Court": 8000,
        "Merchandise Zone": 5000,
        "Parking": 20000,
    }
    operations = []
    for zone in ZONES:
        operations.append({
            "index": {"_index": "stadium_zones", "_id": zone}
        })
        operations.append({
            "zone_name": zone,
            "capacity": ZONE_CAPACITIES.get(zone, 10000),
            "current_attendance": 0
        })
        
    try:
        if operations:
            res = await es_client.bulk(operations=operations)
            if res.get("errors"):
                logger.error("Errors occurred during stadium zones ingestion")
            else:
                logger.info(f"Successfully ingested {len(ZONES)} stadium zones")
    except Exception as e:
        logger.error(f"Failed to bulk ingest stadium zones: {e}")

async def run_initial_ingestion():
    await ingest_vendors()
    await ingest_constraints()
    await ingest_stadium_zones()
