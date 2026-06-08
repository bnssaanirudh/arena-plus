"""
ArenaPulse Pub/Sub Service
============================
High-level pub/sub layer on top of MockRedis.
Provides named channels for agent pipeline stages and telemetry events.
"""

import asyncio
import json
from datetime import datetime, timezone
from typing import Any, AsyncGenerator, Dict, Optional
from loguru import logger

from .mock_redis import mock_redis


# ---------------------------------------------------------------------------
# Channel names
# ---------------------------------------------------------------------------
class Channels:
    """Well-known pub/sub channel names."""
    TELEMETRY_EVENTS = "telemetry.events"
    AGENT_PERCEPTION = "agent.perception"
    AGENT_PLANNING = "agent.planning"
    AGENT_INVENTORY = "agent.inventory"
    AGENT_VALIDATION = "agent.validation"
    AGENT_EXECUTION = "agent.execution"
    AGENT_PIPELINE = "agent.pipeline"  # aggregated pipeline status


# ---------------------------------------------------------------------------
# Pub/Sub service
# ---------------------------------------------------------------------------
class PubSubService:
    """
    Service for publishing and subscribing to event channels.
    Wraps MockRedis pub/sub with JSON serialization and timestamps.
    """

    def __init__(self):
        self._redis = mock_redis

    async def publish(self, channel: str, data: Dict[str, Any],
                      source: Optional[str] = None) -> int:
        """
        Publish a message with metadata.

        Parameters
        ----------
        channel : str
            Channel name from Channels class
        data : dict
            The payload to publish
        source : str, optional
            Name of the sender (e.g., "PerceptionAgent")

        Returns
        -------
        int : number of subscribers that received the message
        """
        message = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "channel": channel,
            "source": source or "system",
            "data": data,
        }
        serialized = json.dumps(message, default=str)

        # Also log to the execution log list
        await self._redis.lpush(
            f"log:{channel}",
            serialized
        )

        return await self._redis.publish(channel, serialized)

    async def subscribe(self, channel: str) -> asyncio.Queue:
        """
        Subscribe to a channel. Returns an asyncio.Queue.
        Messages arrive as JSON strings.
        """
        return await self._redis.subscribe(channel)

    async def unsubscribe(self, channel: str, queue: asyncio.Queue) -> bool:
        """Unsubscribe from a channel."""
        return await self._redis.unsubscribe(channel, queue)

    async def stream(self, channel: str) -> AsyncGenerator[str, None]:
        """
        Async generator that yields messages from a channel.
        Useful for SSE or WebSocket endpoints.
        """
        q = await self.subscribe(channel)
        try:
            while True:
                message = await q.get()
                yield message
        except asyncio.CancelledError:
            await self.unsubscribe(channel, q)

    async def get_recent_logs(self, channel: str, count: int = 50) -> list:
        """Get the most recent log entries for a channel."""
        raw = await self._redis.lrange(f"log:{channel}", 0, count - 1)
        return [json.loads(entry) if isinstance(entry, str) else entry
                for entry in raw]


# Singleton instance
pubsub = PubSubService()
