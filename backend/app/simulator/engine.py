import asyncio
from loguru import logger

from .events import generate_random_event
from ..config import settings


class SimulatorEngine:
    def __init__(self):
        self.running = False
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
                await pubsub.publish("arena:telemetry:raw", event, source="Simulator")
                asyncio.create_task(agent_manager.process_event(event))

            await asyncio.sleep(settings.SIMULATION_INTERVAL_SECONDS)


simulator_engine = SimulatorEngine()
