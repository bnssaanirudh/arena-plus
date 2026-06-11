"""
Tests for the Agent Pipeline
===============================
Tests PerceptionAgent, PlanningAgent, and AgentManager end-to-end.
"""

import sys
import pytest
import asyncio
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


# Mock event data for testing
MOCK_EVENT_LOW_RISK = {
    "event_id": "test-001",
    "event_type": "normal_flow",
    "location": "North Gate",
    "density_score": 2.5,
    "predicted_people": 500,
    "timestamp": "2024-08-01T18:00:00Z",
}

MOCK_EVENT_HIGH_RISK = {
    "event_id": "test-002",
    "event_type": "crowd_surge",
    "location": "South Gate",
    "density_score": 9.0,
    "predicted_people": 12000,
    "timestamp": "2024-08-01T18:00:00Z",
    # ML features to trigger HIGH/CRITICAL prediction
    "Time_Step": 15,
    "max_occupancy_prob": 0.95,
    "avg_pressure_mat_velocity": 50,
    "max_occupancy_prob_velocity": 0.2,
    "attendance_to_capacity_ratio_velocity": 0.1,
}

MOCK_EVENT_CONGESTION = {
    "event_id": "test-003",
    "event_type": "congestion",
    "location": "East Gate",
    "density_score": 7.8,
    "predicted_people": 6000,
    "timestamp": "2024-08-01T18:00:00Z",
    # ML features to trigger HIGH prediction
    "Time_Step": 12,
    "max_occupancy_prob": 0.82,
    "avg_pressure_mat_velocity": 25,
    "max_occupancy_prob_velocity": 0.1,
    "attendance_to_capacity_ratio_velocity": 0.05,
}


class TestPerceptionAgent:
    """Tests for the PerceptionAgent."""

    @pytest.mark.asyncio
    async def test_analyze_returns_valid_structure(self):
        """analyze() should return risk_level and assessment."""
        from app.agents.perception import PerceptionAgent

        agent = PerceptionAgent()
        result = await agent.analyze(MOCK_EVENT_LOW_RISK)

        assert "risk_level" in result
        assert "assessment" in result
        assert "probability" in result
        assert "model_used" in result

    @pytest.mark.asyncio
    async def test_analyze_risk_level_is_valid(self):
        """Risk level should be one of the expected values."""
        from app.agents.perception import PerceptionAgent

        agent = PerceptionAgent()
        result = await agent.analyze(MOCK_EVENT_HIGH_RISK)

        valid_levels = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
        assert result["risk_level"] in valid_levels


class TestPlanningAgent:
    """Tests for the PlanningAgent."""

    @pytest.mark.asyncio
    async def test_monitor_plan_for_low_risk(self):
        """Low risk should result in MONITOR action."""
        from app.agents.planning import PlanningAgent

        agent = PlanningAgent()
        risk = {"risk_level": "LOW", "probability": 0.1}
        plan = await agent.plan(MOCK_EVENT_LOW_RISK, risk)

        assert plan["action"] == "MONITOR"
        assert plan["resources_required"]["water"] == 0
        assert plan["resources_required"]["food"] == 0

    @pytest.mark.asyncio
    async def test_dispatch_plan_for_high_risk(self):
        """High risk should result in DISPATCH or REROUTE action."""
        from app.agents.planning import PlanningAgent

        agent = PlanningAgent()
        risk = {"risk_level": "HIGH", "probability": 0.7}
        plan = await agent.plan(MOCK_EVENT_HIGH_RISK, risk)

        assert plan["action"] in ["DISPATCH_RESOURCES", "REROUTE_CROWD",
                                   "ALERT_SECURITY"]
        assert plan["resources_required"]["water"] > 0

    @pytest.mark.asyncio
    async def test_reroute_for_congestion(self):
        """HIGH risk congestion events should trigger REROUTE_CROWD."""
        from app.agents.planning import PlanningAgent

        agent = PlanningAgent()
        risk = {"risk_level": "HIGH", "probability": 0.75}
        plan = await agent.plan(MOCK_EVENT_CONGESTION, risk)

        assert plan["action"] == "REROUTE_CROWD"

    @pytest.mark.asyncio
    async def test_critical_risk_prioritization(self):
        """Critical risk should have P0 priority."""
        from app.agents.planning import PlanningAgent

        agent = PlanningAgent()
        risk = {"risk_level": "CRITICAL", "probability": 0.95}
        plan = await agent.plan(MOCK_EVENT_HIGH_RISK, risk)

        assert plan["priority"] == "P0"
        assert plan["action"] in ["EVACUATE_ZONE", "ALERT_SECURITY"]

    @pytest.mark.asyncio
    async def test_plan_has_reasoning(self):
        """Every plan should include a reasoning string."""
        from app.agents.planning import PlanningAgent

        agent = PlanningAgent()
        risk = {"risk_level": "MEDIUM", "probability": 0.45}
        plan = await agent.plan(MOCK_EVENT_LOW_RISK, risk)

        assert "reasoning" in plan
        assert len(plan["reasoning"]) > 0


class TestAgentManagerPipeline:
    """End-to-end tests for the full agent pipeline."""

    @pytest.mark.asyncio
    async def test_full_pipeline_low_risk(self):
        """Full pipeline with low-risk event should return MONITOR."""
        from app.agents.manager import AgentManager

        manager = AgentManager()
        result = await manager.process_event(MOCK_EVENT_LOW_RISK)

        assert "risk_assessment" in result
        assert "plan" in result
        # Low risk should stop at MONITOR (no allocation/execution)
        assert result["plan"]["action"] == "MONITOR"

    @pytest.mark.asyncio
    async def test_full_pipeline_high_risk(self):
        """Full pipeline with high-risk event should proceed to execution."""
        from app.agents.manager import AgentManager

        manager = AgentManager()
        result = await manager.process_event(MOCK_EVENT_HIGH_RISK)

        assert "risk_assessment" in result
        assert "plan" in result
        # High risk should proceed past MONITOR
        assert result["plan"]["action"] != "MONITOR"
        # The commerce half always fires on intervention
        assert "deal" in result and result["deal"]["headline"]


class TestMarketingAgent:
    """Action A — autonomous flash deals."""

    @pytest.mark.asyncio
    async def test_deal_is_zone_and_item_aware(self):
        from app.agents.marketing import MarketingAgent

        plan = {"action": "DISPATCH_RESOURCES", "resources_required": {"water": 100, "food": 0}}
        alloc = {"allocations": [{"vendor_id": "V1", "vendor_name": "Cool Drinks",
                                  "take_water": 100, "take_food": 0}]}
        deal = await MarketingAgent().run(MOCK_EVENT_HIGH_RISK, plan, alloc)

        assert deal["headline"] and deal["message"]
        assert 5 <= deal["discount_pct"] <= 50
        assert deal["zone"] == MOCK_EVENT_HIGH_RISK["location"]
        # crowd_surge promotes water; vendor name threaded through
        assert deal["item"] == "water"
        assert deal["vendor_name"] == "Cool Drinks"


class TestRestockOrders:
    """Action B — structured B2B restock orders."""

    @pytest.mark.asyncio
    async def test_dispatch_emits_restock_orders(self):
        from app.agents.execution import ExecutionAgent
        from app.config import settings

        settings.DRY_RUN = True
        validation = {
            "status": "VALID",
            "approved_allocations": [
                {"vendor_id": "V1", "vendor_name": "Cool Drinks", "take_water": 300, "take_food": 100},
            ],
        }
        result = await ExecutionAgent().execute(validation)
        orders = result["restock_orders"]
        assert len(orders) == 2  # one per (vendor, item) with qty > 0
        items = {o["item"] for o in orders}
        assert items == {"water", "food"}
        assert all(o["order_id"].startswith("PO-") and o["supplier"] for o in orders)


class TestApprovalGate:
    """Human-in-the-loop oversight for high-impact actions."""

    @pytest.mark.asyncio
    async def test_high_impact_holds_then_resumes(self):
        from app.agents.manager import AgentManager
        from app.config import settings

        settings.APPROVAL_REQUIRED = True
        settings.APPROVAL_RESOURCE_THRESHOLD = 1  # force every dispatch to gate
        try:
            manager = AgentManager()
            result = await manager.process_event(MOCK_EVENT_HIGH_RISK)
            assert result["execution"]["status"] == "PENDING_APPROVAL"
            assert MOCK_EVENT_HIGH_RISK["event_id"] in manager.list_pending()

            resumed = await manager.resolve_approval(MOCK_EVENT_HIGH_RISK["event_id"], True)
            assert resumed is not None
            assert MOCK_EVENT_HIGH_RISK["event_id"] not in manager.list_pending()
        finally:
            settings.APPROVAL_REQUIRED = False

    @pytest.mark.asyncio
    async def test_reject_cancels_and_unknown_returns_none(self):
        from app.agents.manager import AgentManager
        from app.config import settings

        settings.APPROVAL_REQUIRED = True
        settings.APPROVAL_RESOURCE_THRESHOLD = 1
        try:
            manager = AgentManager()
            await manager.process_event(MOCK_EVENT_HIGH_RISK)
            rejected = await manager.resolve_approval(MOCK_EVENT_HIGH_RISK["event_id"], False)
            assert rejected["status"] == "REJECTED"
            assert await manager.resolve_approval("does-not-exist", True) is None
        finally:
            settings.APPROVAL_REQUIRED = False


class TestVerificationAgent:
    """2.1 — RAG feasibility check + self-correction."""

    @pytest.mark.asyncio
    async def test_verify_returns_required_fields(self):
        from app.agents.verification import VerificationAgent

        plan = {"action": "DISPATCH_RESOURCES", "priority": "P1",
                "resources_required": {"water": 200, "food": 50}, "reasoning": "high risk"}
        alloc = {"allocations": [{"vendor_name": "Cool Drinks", "take_water": 200, "take_food": 50}]}
        result = await VerificationAgent().verify(MOCK_EVENT_HIGH_RISK, plan, alloc)

        assert "feasible" in result and isinstance(result["feasible"], bool)
        assert result["confidence"] in ("HIGH", "MEDIUM", "LOW")
        assert isinstance(result["blocking"], list)
        assert "correction" in result
        assert "constraints" in result
        assert result["verified_by"] in ("gemini", "heuristic")

    @pytest.mark.asyncio
    async def test_constraint_retrieval_matches_zone(self):
        from app.agents.verification import _retrieve_constraints

        # South Gate has a road_closure HIGH constraint — should be retrieved
        hits = await _retrieve_constraints("South Gate", "DISPATCH_RESOURCES")
        ids = [c["id"] for c in hits]
        assert "C001" in ids  # road_closure for South Gate

    @pytest.mark.asyncio
    async def test_heuristic_flags_high_severity_blocking(self):
        from app.agents.verification import VerificationAgent

        # South Gate road_closure is HIGH severity → heuristic should flag infeasible
        event = dict(MOCK_EVENT_HIGH_RISK, location="South Gate")
        plan = {"action": "DISPATCH_RESOURCES", "priority": "P1",
                "resources_required": {"water": 500, "food": 100}, "reasoning": "surge"}
        alloc = {"allocations": []}
        result = await VerificationAgent().verify(event, plan, alloc)
        # heuristic path (no Gemini creds in test env)
        assert result["verified_by"] == "heuristic"
        assert result["feasible"] is False
        assert len(result["blocking"]) > 0

    @pytest.mark.asyncio
    async def test_full_pipeline_includes_verification(self):
        from app.agents.manager import AgentManager

        manager = AgentManager()
        result = await manager.process_event(MOCK_EVENT_HIGH_RISK)
        # verification should be present for any non-MONITOR outcome
        if result["plan"]["action"] != "MONITOR":
            assert "verification" in result
            assert "feasible" in result["verification"]


class TestADKElasticMCP:
    """Tests for the ADK agent with Elastic MCP integration."""

    @pytest.mark.asyncio
    async def test_elastic_mcp_registration_sse(self):
        from app.config import settings
        import app.agents.adk_agent as adk_agent
        from app.agents.adk_agent import _get_runner
        from unittest.mock import patch

        adk_agent._runner = None
        adk_agent._agent = None
        adk_agent._elastic_mcp_toolset = None

        old_url = settings.ELASTIC_MCP_URL
        settings.ELASTIC_MCP_URL = "http://localhost:3001/sse"
        
        try:
            with patch.object(adk_agent.logger, "info") as mock_info:
                runner, session_service = _get_runner()
                assert runner is not None
                from google.adk.tools.mcp_tool.mcp_toolset import SseConnectionParams
                assert isinstance(adk_agent._elastic_mcp_toolset._connection_params, SseConnectionParams)
                mock_info.assert_any_call(f"[ADK] Official Elastic MCP toolset registered — http://localhost:3001/sse")
        finally:
            settings.ELASTIC_MCP_URL = old_url
            adk_agent._runner = None
            adk_agent._agent = None
            adk_agent._elastic_mcp_toolset = None

    @pytest.mark.asyncio
    async def test_elastic_mcp_registration_streamable(self):
        from app.config import settings
        import app.agents.adk_agent as adk_agent
        from app.agents.adk_agent import _get_runner
        from unittest.mock import patch

        adk_agent._runner = None
        adk_agent._agent = None
        adk_agent._elastic_mcp_toolset = None

        old_url = settings.ELASTIC_MCP_URL
        settings.ELASTIC_MCP_URL = "http://localhost:3001/mcp"
        
        try:
            with patch.object(adk_agent.logger, "info") as mock_info:
                runner, session_service = _get_runner()
                assert runner is not None
                from google.adk.tools.mcp_tool.mcp_toolset import StreamableHTTPConnectionParams
                assert isinstance(adk_agent._elastic_mcp_toolset._connection_params, StreamableHTTPConnectionParams)
                mock_info.assert_any_call(f"[ADK] Official Elastic MCP toolset registered — http://localhost:3001/mcp")
        finally:
            settings.ELASTIC_MCP_URL = old_url
            adk_agent._runner = None
            adk_agent._agent = None
            adk_agent._elastic_mcp_toolset = None



