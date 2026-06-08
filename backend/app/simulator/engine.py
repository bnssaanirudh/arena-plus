import asyncio
from typing import AsyncGenerator
from loguru import logger
import json

from .events import generate_random_event
from ..config import settings

class SimulatorEngine:
    def __init__(self):
        self.running = False
        self.subscribers = []
        self._task = None
        
    async def start(self):
        if self.running:
            return
        self.running = True
        logger.info("Starting Simulator Engine")
        self._task = asyncio.create_task(self._run_loop())
        
    async def stop(self):
        self.running = False
        if self._task:
            self._task.cancel()
        logger.info("Simulator Engine stopped")
        
    async def _run_loop(self):
        from ..agents.manager import agent_manager
        from ..infra.pubsub import pubsub
        
        while self.running:
            if settings.SIMULATION_ACTIVE:
                event = generate_random_event()
                
                # Publish raw telemetry for WebSocket clients
                await pubsub.publish("arena:telemetry:raw", event, source="Simulator")
                
                # Process the event through the AI agent pipeline in the background
                asyncio.create_task(agent_manager.process_event(event))
                
                # Legacy SSE subscriber notification
                await self._notify_subscribers(event)
                
            await asyncio.sleep(settings.SIMULATION_INTERVAL_SECONDS)
            
    async def _notify_subscribers(self, event: dict):
        # Clean up dead subscribers
        dead_subs = []
        for q in self.subscribers:
            try:
                # non-blocking put if possible, or wait a bit
                await asyncio.wait_for(q.put(event), timeout=1.0)
            except Exception as e:
                dead_subs.append(q)
                
        for q in dead_subs:
            self.subscribers.remove(q)

    async def subscribe(self) -> AsyncGenerator[str, None]:
        q = asyncio.Queue()
        self.subscribers.append(q)
        try:
            while True:
                event = await q.get()
                yield json.dumps(event)
        except asyncio.CancelledError:
            if q in self.subscribers:
                self.subscribers.remove(q)

simulator_engine = SimulatorEngine()
