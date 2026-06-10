"""
Verification Agent  (project_idea.md — Step 3: corrective RAG verification)
============================================================================
The "non-linear reasoning" step that makes ArenaPulse more than a chatbot.

After Inventory+Validation produce a plan+allocation, this agent:
  1. Retrieves relevant supply-chain constraints (lead times, depot capacity,
     road closures) from the knowledge base.
  2. Asks Gemini to check whether the proposed plan is *feasible* against those
     constraints.
  3. If infeasible, returns a self-correction signal so the manager can re-plan
     with the constraint context injected — closing the reasoning loop.

Primary path: **Gemini 3** evaluates feasibility against retrieved constraints.
Fallback: deterministic rule checks (always available, zero-dep).

Knowledge base: in-memory constraint corpus today (same graceful-degradation
pattern used everywhere). Swap ``_retrieve_constraints`` to hit Elastic
vector/text search once ES creds land — the interface is identical.
"""

import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from loguru import logger

from ..llm import gemini

# ---------------------------------------------------------------------------
# In-memory supply-chain constraint corpus
# Each entry: zone/area the constraint applies to, type, severity, description.
# ---------------------------------------------------------------------------
_CONSTRAINTS: List[Dict[str, Any]] = [
    {
        "id": "C001",
        "zone": "South Gate",
        "type": "road_closure",
        "severity": "HIGH",
        "description": "South Gate access road closed for construction until end of day. Vehicle delivery impossible; foot-carry only within 200m.",
    },
    {
        "id": "C002",
        "zone": "North Gate",
        "type": "depot_capacity",
        "severity": "MEDIUM",
        "description": "North Gate depot at 80% capacity. Max 500 additional water units can be accepted before overflow.",
    },
    {
        "id": "C003",
        "zone": "West Gate",
        "type": "lead_time",
        "severity": "MEDIUM",
        "description": "West Gate resupply lead time is 45 minutes minimum due to traffic on outer ring road.",
    },
    {
        "id": "C004",
        "zone": "East Gate",
        "type": "depot_capacity",
        "severity": "LOW",
        "description": "East Gate depot fully stocked. Surplus water available for redistribution.",
    },
    {
        "id": "C005",
        "zone": "Merchandise Zone",
        "type": "lead_time",
        "severity": "LOW",
        "description": "Merchandise Zone restocking lead time 20 minutes; supplier truck on standby.",
    },
    {
        "id": "C006",
        "zone": "Parking",
        "type": "road_closure",
        "severity": "HIGH",
        "description": "Parking Lot B access blocked by event barrier. No vehicle ingress until post-match.",
    },
    {
        "id": "C007",
        "zone": "VIP Section",
        "type": "depot_capacity",
        "severity": "LOW",
        "description": "VIP Section has dedicated cold-storage with 2000 water unit capacity, always pre-stocked.",
    },
    {
        "id": "C008",
        "zone": "General",
        "type": "lead_time",
        "severity": "MEDIUM",
        "description": "Stadium-wide emergency water requisition requires 30-minute procurement cycle from offsite depot.",
    },
]

_VERIFY_SCHEMA = {
    "type": "object",
    "properties": {
        "feasible": {"type": "boolean"},
        "confidence": {"type": "string", "enum": ["HIGH", "MEDIUM", "LOW"]},
        "blocking_constraints": {
            "type": "array",
            "items": {"type": "string"},
        },
        "correction": {"type": "string"},
    },
    "required": ["feasible", "confidence", "blocking_constraints", "correction"],
}

_SYSTEM_INSTRUCTION = (
    "You are the Verification Agent for ArenaPulse, checking whether a proposed "
    "intervention plan is actually executable given real supply-chain constraints. "
    "Be conservative: if a constraint plausibly blocks the plan, flag it. "
    "If infeasible, write a concrete correction instruction the Planning Agent "
    "can use to re-plan (e.g. 'Route via East Gate depot instead — road closed at South Gate'). "
    "If feasible, correction should be empty string. "
    "Respond ONLY with the structured JSON."
)


async def _retrieve_constraints(zone: str, action: str) -> List[Dict[str, Any]]:
    """Retrieve relevant constraints for a zone + action from Elasticsearch.

    Hybrid retrieval: BM25 keyword match + kNN over Gemini embeddings when a
    query vector is available; pure BM25 otherwise; in-memory keyword fallback
    when ES is down. Hits never include the (large) embedding field.
    """
    try:
        from ..elastic.client import es_client

        body: Dict[str, Any] = {
            "query": {
                "bool": {
                    "should": [
                        {"match": {"zone": {"query": zone, "boost": 2.0}}},
                        {"match": {"description": f"{zone} {action}"}},
                        {"term": {"severity": "HIGH"}}
                    ]
                }
            },
            "size": 5,
            "_source": {"excludes": ["embedding"]},
        }

        # Semantic half of the hybrid query — skipped cleanly if embedding fails.
        query_vector = await gemini.embed_text(f"{action} intervention at {zone}")
        if query_vector:
            body["knn"] = {
                "field": "embedding",
                "query_vector": query_vector,
                "k": 5,
                "num_candidates": 16,
            }

        res = await es_client.search(index="supply_constraints", body=body)
        hits = []
        for hit in res.get("hits", {}).get("hits", []):
            hits.append(hit["_source"])
        if hits:
            mode = "hybrid BM25+kNN" if query_vector else "BM25"
            logger.info(f"Retrieved {len(hits)} constraints from Elasticsearch ({mode})")
            return hits
    except Exception as e:
        logger.warning(f"Failed to query supply_constraints in Elasticsearch: {e}. Falling back to in-memory constraints.")

    # Local fallback
    zone_lower = zone.lower()
    action_lower = action.lower()
    hits = []
    for c in _CONSTRAINTS:
        c_zone = c["zone"].lower()
        zone_match = c_zone in zone_lower or zone_lower in c_zone or c_zone == "general"
        action_match = (
            action_lower in ("dispatch_resources", "evacuate_zone")
            or c["severity"] == "HIGH"
        )
        if zone_match or (action_match and c["severity"] != "LOW"):
            hits.append(c)
    return hits[:5]  # cap at 5


def _format_constraints(constraints: List[Dict[str, Any]]) -> str:
    if not constraints:
        return "No specific constraints found for this zone."
    lines = []
    for c in constraints:
        lines.append(f"[{c['id']} | {c['type']} | {c['severity']}] {c['description']}")
    return "\n".join(lines)


class VerificationAgent:
    """
    Checks plan feasibility against supply-chain constraints and signals
    self-correction when the plan won't execute cleanly.
    """

    async def verify(
        self,
        event_data: dict,
        plan: dict,
        allocation: dict,
        previous_correction: Optional[str] = None,
    ) -> dict:
        """
        Returns a verification result dict:
          feasible       bool
          confidence     HIGH/MEDIUM/LOW
          blocking       list of constraint descriptions
          correction     instruction for re-planning (empty if feasible)
          constraints    the retrieved docs (for dashboard display)
          verified_by    "gemini" | "heuristic"
          checked_at     ISO timestamp
        """
        logger.info("VerificationAgent checking supply-chain feasibility")

        zone = event_data.get("location", "General")
        action = plan.get("action", "MONITOR")
        constraints = await _retrieve_constraints(zone, action)

        result = await self._gemini_verify(zone, action, plan, allocation, constraints, previous_correction)
        source = "gemini"
        if result is None:
            result = self._heuristic_verify(zone, action, constraints)
            source = "heuristic"

        result.update(
            {
                "constraints": constraints,
                "verified_by": source,
                "checked_at": datetime.now(timezone.utc).isoformat(),
            }
        )

        status = "FEASIBLE" if result["feasible"] else "INFEASIBLE"
        logger.info(
            f"VerificationAgent ({source}): {status} "
            f"[{result['confidence']}] — {len(constraints)} constraint(s) checked"
        )
        if not result["feasible"]:
            logger.warning(f"Self-correction needed: {result['correction']}")

        return result

    async def _gemini_verify(
        self,
        zone: str,
        action: str,
        plan: dict,
        allocation: dict,
        constraints: List[Dict[str, Any]],
        previous_correction: Optional[str],
    ) -> Optional[Dict[str, Any]]:
        if not gemini.is_available():
            return None

        alloc_summary = ", ".join(
            f"{a['vendor_name']}: {a['take_water']}W/{a['take_food']}F"
            for a in (allocation.get("allocations") or [])
        ) or "no allocations"

        correction_note = (
            f"\nPrevious self-correction attempt: {previous_correction}"
            if previous_correction
            else ""
        )

        prompt = (
            f"Verify feasibility of this intervention plan.\n\n"
            f"Zone: {zone}\n"
            f"Action: {action}\n"
            f"Priority: {plan.get('priority', 'n/a')}\n"
            f"Resources requested: water={plan.get('resources_required', {}).get('water', 0)}, "
            f"food={plan.get('resources_required', {}).get('food', 0)}\n"
            f"Allocation: {alloc_summary}\n"
            f"Planner reasoning: {plan.get('reasoning', 'n/a')}\n"
            f"{correction_note}\n\n"
            f"Known supply-chain constraints:\n{_format_constraints(constraints)}\n\n"
            "Is this plan feasible? List any blocking constraints. "
            "If infeasible, write a concrete correction instruction."
        )

        raw = await gemini.generate_json(
            prompt, schema=_VERIFY_SCHEMA, system_instruction=_SYSTEM_INSTRUCTION
        )
        if not raw or "feasible" not in raw:
            return None

        return {
            "feasible": bool(raw["feasible"]),
            "confidence": raw.get("confidence", "MEDIUM"),
            "blocking": list(raw.get("blocking_constraints") or []),
            "correction": str(raw.get("correction") or ""),
        }

    def _heuristic_verify(
        self, zone: str, action: str, constraints: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Deterministic fallback — flag HIGH-severity constraints as blocking."""
        blocking = [
            c["description"]
            for c in constraints
            if c["severity"] == "HIGH"
            and action in ("DISPATCH_RESOURCES", "EVACUATE_ZONE")
        ]
        feasible = len(blocking) == 0
        correction = (
            "Re-route dispatch via alternative access point — high-severity constraint blocks primary route."
            if not feasible
            else ""
        )
        return {
            "feasible": feasible,
            "confidence": "MEDIUM",
            "blocking": blocking,
            "correction": correction,
        }
