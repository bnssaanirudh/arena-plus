"""
Approvals router — human-in-the-loop oversight.

When ``APPROVAL_REQUIRED`` is enabled, high-impact agent decisions pause as
PENDING_APPROVAL. A human operator lists and resolves them here; resolving an
approval resumes (or cancels) the held pipeline.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..agents.manager import agent_manager

router = APIRouter()


class ApprovalDecision(BaseModel):
    approved: bool


@router.get("/")
async def list_pending():
    """List pipelines currently awaiting human approval."""
    pending = agent_manager.list_pending()
    return [
        {
            "event_id": event_id,
            "action": ctx["plan"]["action"],
            "priority": ctx["plan"].get("priority"),
            "reasoning": ctx["plan"].get("reasoning"),
            "resources_required": ctx["plan"].get("resources_required"),
            "location": ctx["event_data"].get("location"),
            "requested_at": ctx["requested_at"],
        }
        for event_id, ctx in pending.items()
    ]


@router.post("/{event_id}")
async def resolve(event_id: str, decision: ApprovalDecision):
    """Approve (resume execution) or reject (cancel) a held pipeline."""
    result = await agent_manager.resolve_approval(event_id, decision.approved)
    if result is None:
        raise HTTPException(status_code=404, detail="No pending approval for that event_id")
    return {"event_id": event_id, "approved": decision.approved, "result": result}
