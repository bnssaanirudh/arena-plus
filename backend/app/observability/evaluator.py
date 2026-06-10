"""
LLM-judge plan evaluation  (Arize secondary integration, judging bonus)
========================================================================
After a pipeline completes, a Gemini judge scores the executed plan 1-10 for
operational quality. The score lands in two places:

  1. An OTel span (``plan_eval``) with ``eval.score`` / ``eval.rationale``
     attributes — visible in Arize Phoenix next to the pipeline's traces, so
     the demo shows "we observe AND evaluate".
  2. The ``agent.pipeline`` pub/sub channel as a ``plan_eval`` payload — the
     dashboard EventTimeline shows a "Judge: N/10" badge per event.

Config-gated by ``PLAN_EVAL_ENABLED`` (1 extra Gemini call per pipeline).
Fire-and-forget: any failure is logged and swallowed.
"""

from typing import Optional

from loguru import logger

from ..config import settings
from ..llm import gemini
from ..infra.pubsub import pubsub, Channels

_EVAL_SCHEMA = {
    "type": "object",
    "properties": {
        "score": {"type": "integer"},
        "rationale": {"type": "string"},
    },
    "required": ["score", "rationale"],
}

_JUDGE_INSTRUCTION = (
    "You are an impartial operations auditor scoring an autonomous logistics "
    "agent's intervention plan after the fact. Score 1-10: was the action "
    "proportionate to the risk, were resources sized sensibly for the crowd, "
    "and did the plan respect known constraints? 9-10 = excellent, 5-6 = "
    "acceptable with concerns, 1-4 = poor. One-sentence rationale. "
    "Respond ONLY with the structured JSON."
)


async def evaluate_plan(event_id: str, event_data: dict, plan: dict, verification: Optional[dict] = None) -> None:
    """Judge the executed plan. Runs as a background task after _finalize."""
    if not settings.PLAN_EVAL_ENABLED or not gemini.is_available():
        return

    try:
        constraints_note = ""
        if verification:
            feasible = verification.get("feasible", True)
            constraints_note = (
                f"\nRAG verification: {'feasible' if feasible else 'infeasible'}"
                f" ({verification.get('confidence', 'n/a')} confidence,"
                f" {len(verification.get('constraints', []))} constraint(s) checked)"
            )

        prompt = (
            "Score this executed intervention plan.\n\n"
            f"Zone: {event_data.get('location', 'unknown')}\n"
            f"Event type: {event_data.get('event_type', 'unknown')}\n"
            f"Density score (0-10): {event_data.get('density_score', 'n/a')}\n"
            f"Predicted people: {event_data.get('predicted_people', 'n/a')}\n\n"
            f"Action taken: {plan.get('action', 'UNKNOWN')} [{plan.get('priority', '')}]\n"
            f"Resources: water={plan.get('resources_required', {}).get('water', 0)}, "
            f"food={plan.get('resources_required', {}).get('food', 0)}\n"
            f"Planner: {plan.get('planner', 'unknown')}, "
            f"self-corrections: {plan.get('replan_count', 0)}\n"
            f"Agent reasoning: {plan.get('reasoning', 'n/a')}"
            f"{constraints_note}"
        )

        # Wrap the judge call in a span so the score is queryable in Phoenix.
        from opentelemetry import trace

        tracer = trace.get_tracer("arenapulse.eval")
        with tracer.start_as_current_span("plan_eval") as span:
            span.set_attribute("event.id", event_id)
            span.set_attribute("event.zone", str(event_data.get("location", "")))
            span.set_attribute("plan.action", str(plan.get("action", "")))
            span.set_attribute("plan.planner", str(plan.get("planner", "")))

            result = await gemini.generate_json(
                prompt, schema=_EVAL_SCHEMA, system_instruction=_JUDGE_INSTRUCTION
            )
            if not result or "score" not in result:
                span.set_attribute("eval.status", "failed")
                return

            score = max(1, min(10, int(result["score"])))
            rationale = str(result.get("rationale", ""))
            span.set_attribute("eval.score", score)
            span.set_attribute("eval.rationale", rationale)

        logger.info(f"🧑‍⚖️ Plan eval for {event_id}: {score}/10 — {rationale}")
        await pubsub.publish(Channels.AGENT_PIPELINE, {
            "event_id": event_id,
            "stage": "EVALUATED",
            "eval": {"score": score, "rationale": rationale},
        }, source="PlanEvaluator")

    except Exception as e:
        logger.warning(f"Plan eval failed (non-blocking): {e}")
