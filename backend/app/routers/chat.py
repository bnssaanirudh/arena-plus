from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, List
import os
from ..llm import gemini
from ..elastic.client import es_client, check_connection
from ..elastic.indexes import INDEXES
from ..simulator.vendors import get_all_vendors
from ..simulator.engine import simulator_engine

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    history: List[Dict[str, str]] = []  # optional history format [{"role": "user"/"model", "content": "..."}]

@router.post("/")
async def chat_handler(req: ChatRequest) -> Dict[str, Any]:
    # Gather live context to feed Gemini
    es_live = await check_connection()
    es_counts = {}
    if es_live:
        for idx in INDEXES.keys():
            try:
                res = await es_client.count(index=idx)
                es_counts[idx] = res.get("count", 0)
            except Exception:
                es_counts[idx] = 0
                
    # Check low stock vendors
    all_v = get_all_vendors()
    low_stock = [v for v in all_v if v["inventory_water"] < 25 or v["inventory_food"] < 25]
    
    # Construct System Instruction containing live context
    system_instruction = (
        "You are the ArenaPulse Assistant, a supportive AI helper inside the stadium command console.\n"
        "You help stadium operators coordinate concessions, analyze crowd bottlenecks, and supervise swarm dispatches.\n"
        "Be concise, professional, and operations-oriented. Speak as a tactical command advisor.\n\n"
        "LIVE SYSTEM METRICS:\n"
        f"- Elasticsearch: {'CONNECTED' if es_live else 'OFFLINE'}\n"
        f"- Elasticsearch index records: {es_counts}\n"
        f"- Total registered vendors: {len(all_v)}\n"
        f"- Concessions in low stock (<25 units): {len(low_stock)}\n"
        f"- Simulator Engine: {'RUNNING' if simulator_engine.running else 'STOPPED'}\n"
        "- Operational Environment: Local dev (DRY_RUN mode active)\n\n"
        "If operators ask to trigger an alert, remind them they can do so in the Command Center page or ask you."
    )
    
    # Call Gemini wrapper if available
    reply = None
    if gemini.is_available():
        # Compile history into a prompt or pass it to generate_text
        prompt = ""
        for h in req.history[-6:]:
            role = "User" if h.get("role") == "user" else "Assistant"
            prompt += f"{role}: {h.get('content')}\n"
        prompt += f"User: {req.message}\nAssistant:"
        
        reply = await gemini.generate_text(prompt, system_instruction=system_instruction)
        
    # Heuristic fallback if Gemini is unconfigured or fails
    if not reply:
        msg_lower = req.message.lower()
        if "vendor" in msg_lower or "inventory" in msg_lower or "stock" in msg_lower:
            reply = f"Currently, we are tracking {len(all_v)} concessions. There are {len(low_stock)} stands reporting low stock levels (< 25 units). You can view details in the B2B Supply Hub."
        elif "status" in msg_lower or "system" in msg_lower or "elastic" in msg_lower:
            reply = f"System connection status: Elasticsearch is {'Online' if es_live else 'Offline'}. Simulator is currently {'running' if simulator_engine.running else 'stopped'}. Tracing is active via Arize Phoenix."
        elif "zone" in msg_lower or "crowd" in msg_lower or "bottleneck" in msg_lower:
            reply = "We are monitoring crowd levels across 7 zones. The VisionEngine maps Turnstile entries via WebSockets, and BM25 RAG queries index constraints for planning."
        else:
            reply = "Welcome to the ArenaPulse Command Console. I can assist you with vendor inventories, system connection status, and swarm planning logic."
            
    return {"reply": reply}
