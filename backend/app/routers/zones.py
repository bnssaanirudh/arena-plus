from fastapi import APIRouter
from typing import List
from ..simulator.events import ZONES

router = APIRouter()

@router.get("/")
async def list_zones() -> List[str]:
    return ZONES
