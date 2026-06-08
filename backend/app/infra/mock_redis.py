"""
Mock Redis Implementation
===========================
In-memory mock of Redis that provides pub/sub and key-value operations.
Used for local development; will be swapped for real Redis when deploying.
"""

import asyncio
from collections import defaultdict
from typing import Any, Dict, List, Optional, Set
from loguru import logger


class MockRedis:
    """
    In-memory mock Redis with pub/sub and key-value store.
    Thread-safe via asyncio primitives.
    """

    def __init__(self):
        self._store: Dict[str, Any] = {}
        self._channels: Dict[str, List[asyncio.Queue]] = defaultdict(list)
        self._lock = asyncio.Lock()
        logger.info("MockRedis initialized (in-memory mode)")

    # ----- Key-Value Operations -----

    async def get(self, key: str) -> Optional[str]:
        """Get value by key."""
        return self._store.get(key)

    async def set(self, key: str, value: Any, ex: Optional[int] = None) -> bool:
        """Set key to value. `ex` (TTL in seconds) is accepted but ignored in mock."""
        self._store[key] = value
        return True

    async def delete(self, key: str) -> bool:
        """Delete a key."""
        if key in self._store:
            del self._store[key]
            return True
        return False

    async def exists(self, key: str) -> bool:
        """Check if key exists."""
        return key in self._store

    async def keys(self, pattern: str = "*") -> List[str]:
        """List keys matching pattern. Only supports '*' (all) and prefix matching."""
        if pattern == "*":
            return list(self._store.keys())
        prefix = pattern.rstrip("*")
        return [k for k in self._store if k.startswith(prefix)]

    # ----- Pub/Sub Operations -----

    async def publish(self, channel: str, message: Any) -> int:
        """
        Publish a message to a channel.
        Returns number of subscribers that received the message.
        """
        subscribers = self._channels.get(channel, [])
        dead_subs = []
        delivered = 0

        for q in subscribers:
            try:
                await asyncio.wait_for(q.put(message), timeout=1.0)
                delivered += 1
            except Exception:
                dead_subs.append(q)

        # Clean up dead subscribers
        for q in dead_subs:
            if q in self._channels[channel]:
                self._channels[channel].remove(q)

        return delivered

    async def subscribe(self, channel: str) -> asyncio.Queue:
        """
        Subscribe to a channel. Returns an asyncio.Queue that will
        receive messages published to the channel.
        """
        q: asyncio.Queue = asyncio.Queue()
        async with self._lock:
            self._channels[channel].append(q)
        logger.debug(f"New subscriber on channel '{channel}' "
                     f"(total: {len(self._channels[channel])})")
        return q

    async def unsubscribe(self, channel: str, queue: asyncio.Queue) -> bool:
        """Unsubscribe a queue from a channel."""
        async with self._lock:
            if channel in self._channels and queue in self._channels[channel]:
                self._channels[channel].remove(queue)
                return True
        return False

    def get_channel_subscriber_count(self, channel: str) -> int:
        """Get number of subscribers on a channel."""
        return len(self._channels.get(channel, []))

    # ----- List Operations (for agent execution logs) -----

    async def lpush(self, key: str, *values: Any) -> int:
        """Push values to the head of a list."""
        if key not in self._store:
            self._store[key] = []
        for v in values:
            self._store[key].insert(0, v)
        return len(self._store[key])

    async def lrange(self, key: str, start: int, stop: int) -> List[Any]:
        """Get a range from a list. stop=-1 means to the end."""
        lst = self._store.get(key, [])
        if stop == -1:
            return lst[start:]
        return lst[start:stop + 1]


# Singleton instance
mock_redis = MockRedis()
