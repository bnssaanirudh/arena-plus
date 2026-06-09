"""
Tests for the Pub/Sub Infrastructure
========================================
Tests MockRedis and PubSubService.
"""

import sys
import json
import pytest
import asyncio
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class TestMockRedis:
    """Tests for the MockRedis implementation."""

    @pytest.mark.asyncio
    async def test_set_and_get(self):
        """set/get should store and retrieve values."""
        from app.infra.mock_redis import MockRedis
        redis = MockRedis()

        await redis.set("key1", "value1")
        result = await redis.get("key1")
        assert result == "value1"

    @pytest.mark.asyncio
    async def test_get_missing_key(self):
        """get on missing key should return None."""
        from app.infra.mock_redis import MockRedis
        redis = MockRedis()

        result = await redis.get("nonexistent")
        assert result is None

    @pytest.mark.asyncio
    async def test_delete(self):
        """delete should remove a key."""
        from app.infra.mock_redis import MockRedis
        redis = MockRedis()

        await redis.set("key1", "value1")
        await redis.delete("key1")
        result = await redis.get("key1")
        assert result is None

    @pytest.mark.asyncio
    async def test_exists(self):
        """exists should return True for existing keys."""
        from app.infra.mock_redis import MockRedis
        redis = MockRedis()

        assert not await redis.exists("key1")
        await redis.set("key1", "value1")
        assert await redis.exists("key1")

    @pytest.mark.asyncio
    async def test_pubsub_basic(self):
        """Publisher should deliver message to subscriber."""
        from app.infra.mock_redis import MockRedis
        redis = MockRedis()

        q = await redis.subscribe("test_channel")
        await redis.publish("test_channel", "hello")

        msg = await asyncio.wait_for(q.get(), timeout=1.0)
        assert msg == "hello"

    @pytest.mark.asyncio
    async def test_pubsub_multiple_subscribers(self):
        """Multiple subscribers on same channel should all receive the message."""
        from app.infra.mock_redis import MockRedis
        redis = MockRedis()

        q1 = await redis.subscribe("chan")
        q2 = await redis.subscribe("chan")

        delivered = await redis.publish("chan", "broadcast")
        assert delivered == 2

        msg1 = await asyncio.wait_for(q1.get(), timeout=1.0)
        msg2 = await asyncio.wait_for(q2.get(), timeout=1.0)
        assert msg1 == "broadcast"
        assert msg2 == "broadcast"

    @pytest.mark.asyncio
    async def test_pubsub_channel_isolation(self):
        """Messages on one channel should not leak to another."""
        from app.infra.mock_redis import MockRedis
        redis = MockRedis()

        q_a = await redis.subscribe("channel_a")
        q_b = await redis.subscribe("channel_b")

        await redis.publish("channel_a", "for_a_only")

        msg = await asyncio.wait_for(q_a.get(), timeout=1.0)
        assert msg == "for_a_only"

        # channel_b should have no messages
        assert q_b.empty()

    @pytest.mark.asyncio
    async def test_unsubscribe(self):
        """Unsubscribed queue should stop receiving messages."""
        from app.infra.mock_redis import MockRedis
        redis = MockRedis()

        q = await redis.subscribe("chan")
        await redis.unsubscribe("chan", q)

        delivered = await redis.publish("chan", "after_unsub")
        assert delivered == 0

    @pytest.mark.asyncio
    async def test_lpush_and_lrange(self):
        """lpush/lrange should work as a list."""
        from app.infra.mock_redis import MockRedis
        redis = MockRedis()

        await redis.lpush("log", "entry1")
        await redis.lpush("log", "entry2")
        await redis.lpush("log", "entry3")

        result = await redis.lrange("log", 0, -1)
        assert result == ["entry3", "entry2", "entry1"]

        result_partial = await redis.lrange("log", 0, 1)
        assert result_partial == ["entry3", "entry2"]


class TestPubSubService:
    """Tests for the high-level PubSubService."""

    @pytest.mark.asyncio
    async def test_publish_and_subscribe(self):
        """PubSubService should serialize messages as JSON with metadata."""
        from app.infra.pubsub import PubSubService

        svc = PubSubService()
        q = await svc.subscribe("test.channel")

        await svc.publish("test.channel", {"key": "value"}, source="test")

        raw = await asyncio.wait_for(q.get(), timeout=1.0)
        msg = json.loads(raw)

        assert msg["channel"] == "test.channel"
        assert msg["source"] == "test"
        assert msg["data"]["key"] == "value"
        assert "timestamp" in msg

    @pytest.mark.asyncio
    async def test_telemetry_history(self):
        """get_telemetry_history should return raw telemetry events newest-first."""
        from app.infra.pubsub import PubSubService, TELEMETRY_RAW_CHANNEL

        svc = PubSubService()
        await svc.publish(TELEMETRY_RAW_CHANNEL, {"event_id": "a", "density_score": 3.0})
        await svc.publish(TELEMETRY_RAW_CHANNEL, {"event_id": "b", "density_score": 7.0})

        history = svc.get_telemetry_history(limit=10)
        assert len(history) >= 2
        # newest first
        assert history[0]["event_id"] == "b"
