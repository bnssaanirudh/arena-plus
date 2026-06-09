"""
ArenaPulse Pub/Sub Service
============================
High-level pub/sub layer on top of MockRedis.
Provides named channels for agent pipeline stages and telemetry events.
"""

import asyncio
import json
from collections import deque
from datetime import datetime, timezone
from typing import Any, Deque, Dict, List, Optional

from .mock_redis import mock_redis

TELEMETRY_RAW_CHANNEL = "arena:telemetry:raw"
_HISTORY_MAX = 100


# ---------------------------------------------------------------------------
# Channel names
# ---------------------------------------------------------------------------
class Channels:
    """Well-known pub/sub channel names."""
    AGENT_PERCEPTION = "agent.perception"
    AGENT_PLANNING = "agent.planning"
    AGENT_INVENTORY = "agent.inventory"
    AGENT_VALIDATION = "agent.validation"
    AGENT_EXECUTION = "agent.execution"
    AGENT_MARKETING = "agent.marketing"  # autonomous flash-deal campaigns
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
        self._telemetry_history: Deque[Dict] = deque(maxlen=_HISTORY_MAX)

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

        # Keep a rolling history of raw telemetry events
        if channel == TELEMETRY_RAW_CHANNEL:
            self._telemetry_history.append(data)

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

    def get_telemetry_history(self, limit: int = _HISTORY_MAX) -> List[Dict]:
        """Return the most recent telemetry events (newest first)."""
        events = list(self._telemetry_history)
        events.reverse()
        return events[:limit]



# Singleton instance
pubsub = PubSubService()
