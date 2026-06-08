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
