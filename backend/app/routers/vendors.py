from fastapi import APIRouter
from typing import List, Dict, Any
from ..simulator.vendors import get_all_vendors

router = APIRouter()

@router.get("/")
async def list_vendors() -> List[Dict[str, Any]]:
    return get_all_vendors()
