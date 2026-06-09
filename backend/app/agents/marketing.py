"""
Marketing Agent  (project_idea.md — Action A: autonomous flash deals)
=====================================================================
The commerce half of the mission. When the coordinator intervenes on a zone,
the MarketingAgent turns the same surge signal into a *hyper-local flash deal*:
a short, on-brand offer aimed at fans in (or heading to) the affected zone —
to smooth demand, move stock at nearby vendors, and capture revenue.

Primary path: **Gemini 3** drafts the campaign copy + discount. Fallback: a
deterministic template — so the agent still produces a deal with zero external
deps, preserving graceful degradation.
"""

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from loguru import logger

from ..llm import gemini

# Which item to push, by event type — pull surplus where the crowd is forming.
_ITEM_BY_EVENT = {
    "crowd_surge": "water",
    "heat_warning": "water",
    "congestion": "food",
    "security_alert": "merchandise",
}

_DEAL_SCHEMA = {
    "type": "object",
    "properties": {
        "headline": {"type": "string"},
        "message": {"type": "string"},
        "discount_pct": {"type": "integer"},
        "item": {"type": "string"},
    },
    "required": ["headline", "message", "discount_pct", "item"],
}

_SYSTEM_INSTRUCTION = (
    "You are the Marketing Agent for ArenaPulse at a FIFA World Cup 2026 stadium. "
    "Write a single hyper-local flash-deal push notification for fans near a specific "
    "zone, tied to live conditions. Keep it punchy (headline <=8 words, message <=160 "
    "chars), useful (helps with the crowd/heat/queue situation), and on-brand. Pick a "
    "sensible discount (10-30%). Respond ONLY with the structured deal."
)


class MarketingAgent:
    """Generates an autonomous, surge-aware flash deal for the affected zone."""

    async def run(self, event_data: dict, plan: dict, allocation: Optional[dict] = None) -> dict:
        logger.info("MarketingAgent drafting flash deal")

        zone = event_data.get("location", "the stadium")
        event_type = event_data.get("event_type", "crowd_surge")
        item = _ITEM_BY_EVENT.get(event_type, "water")
        window_minutes = 30
        vendor_name = self._pick_vendor(allocation)

        deal = await self._gemini_deal(zone, event_type, item, window_minutes, vendor_name)
        source = "gemini"
        if deal is None:
            deal = self._heuristic_deal(zone, item, window_minutes, vendor_name)
            source = "heuristic"

        deal.update(
            {
                "zone": zone,
                "event_type": event_type,
                "valid_for_minutes": window_minutes,
                "vendor_name": vendor_name,
                "drafted_by": source,
                "issued_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        logger.info(f"MarketingAgent ({source}) → {deal['headline']!r} for {zone}")
        return deal

    async def _gemini_deal(
        self, zone: str, event_type: str, item: str, window: int, vendor_name: Optional[str]
    ) -> Optional[Dict[str, Any]]:
        if not gemini.is_available():
            return None

        prompt = (
            "Draft one flash deal.\n"
            f"Zone: {zone}\n"
            f"Live condition: {event_type}\n"
            f"Item to promote: {item}\n"
            f"Nearest vendor: {vendor_name or 'closest stadium vendor'}\n"
            f"Validity window: next {window} minutes\n"
        )
        result = await gemini.generate_json(
            prompt, schema=_DEAL_SCHEMA, system_instruction=_SYSTEM_INSTRUCTION
        )
        if not result or not result.get("headline") or not result.get("message"):
            return None
        return {
            "headline": str(result["headline"]),
            "message": str(result["message"]),
            "discount_pct": max(5, min(50, int(result.get("discount_pct", 20) or 20))),
            "item": str(result.get("item") or item),
        }

    def _heuristic_deal(
        self, zone: str, item: str, window: int, vendor_name: Optional[str]
    ) -> Dict[str, Any]:
        where = vendor_name or "the nearest vendor"
        return {
            "headline": f"Beat the rush — {item} deal!",
            "message": (
                f"Crowds building near {zone}. Grab 20% off {item} at {where} "
                f"in the next {window} min. Stay cool, stay quick. ⚡"
            ),
            "discount_pct": 20,
            "item": item,
        }

    @staticmethod
    def _pick_vendor(allocation: Optional[dict]) -> Optional[str]:
        if not allocation:
            return None
        allocs = allocation.get("allocations") or []
        if allocs:
            return allocs[0].get("vendor_name")
        return None
