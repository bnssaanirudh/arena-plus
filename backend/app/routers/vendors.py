from fastapi import APIRouter
from typing import List, Dict, Any
from ..simulator.vendors import get_all_vendors
from ..elastic.client import es_client

router = APIRouter()

@router.get("/")
async def list_vendors() -> List[Dict[str, Any]]:
    try:
        # Search Elasticsearch vendors index
        query = {
            "query": {"match_all": {}},
            "size": 100
        }
        res = await es_client.search(index="vendors", body=query)
        hits = []
        for hit in res.get("hits", {}).get("hits", []):
            vendor = hit["_source"]
            # Restore latitude/longitude for the frontend representation
            if "location" in vendor and isinstance(vendor["location"], dict):
                loc = vendor.pop("location")
                vendor["latitude"] = loc.get("lat")
                vendor["longitude"] = loc.get("lon")
            hits.append(vendor)
        if hits:
            return hits
    except Exception:
        # Fall back to hardcoded vendors
        pass

    return get_all_vendors()
