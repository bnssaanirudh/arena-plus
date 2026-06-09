from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from .tools import MCPTools

router = APIRouter()

class NearestVendorReq(BaseModel):
    lat: float
    lon: float
    distance: str = "500m"

class UpdateInventoryReq(BaseModel):
    vendor_id: str
    water: Optional[int] = None
    food: Optional[int] = None
    merchandise: Optional[int] = None

class RecordActionReq(BaseModel):
    agent_name: str
    action: str
    reasoning: str

@router.get("/tools/inventory/{vendor_id}")
async def query_inventory(vendor_id: str):
    return await MCPTools.query_local_inventory(vendor_id)

@router.post("/tools/nearest_vendor")
async def nearest_vendor(req: NearestVendorReq):
    return await MCPTools.find_nearest_vendor(req.lat, req.lon, req.distance)

@router.get("/tools/overloaded_zone")
async def overloaded_zone(threshold: float = 8.0):
    return await MCPTools.find_overloaded_zone(threshold)

@router.get("/tools/recent_surges")
async def recent_surges(minutes: int = 15):
    return await MCPTools.get_recent_surges(minutes)

@router.post("/tools/update_inventory")
async def update_inventory(req: UpdateInventoryReq):
    success = await MCPTools.update_vendor_inventory(req.vendor_id, req.water, req.food, req.merchandise)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update inventory")
    return {"status": "success"}

@router.post("/tools/record_action")
async def record_action(req: RecordActionReq):
    decision_id = await MCPTools.record_agent_action(req.agent_name, req.action, req.reasoning)
    return {"decision_id": decision_id}
