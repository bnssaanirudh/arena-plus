from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from loguru import logger

from .config import settings
from .simulator.engine import simulator_engine
from .routers import events, vendors, zones, websockets, approvals, status, chat
from .mcp import router as mcp_router
from .elastic.client import check_connection
from .elastic.indexes import setup_indexes
from .elastic.ingestion import run_initial_ingestion
from .observability.tracer import setup_phoenix

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info(f"Starting {settings.PROJECT_NAME} API")
    setup_phoenix()
    
    if settings.SIMULATION_ACTIVE:
        await simulator_engine.start()
        
    # Check ES connection
    es_up = await check_connection()
    if es_up:
        await setup_indexes()
        await run_initial_ingestion()
        
    yield
    # Shutdown
    logger.info(f"Shutting down {settings.PROJECT_NAME} API")
    await simulator_engine.stop()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events.router, prefix=f"{settings.API_V1_STR}/events", tags=["events"])
app.include_router(vendors.router, prefix=f"{settings.API_V1_STR}/vendors", tags=["vendors"])
app.include_router(zones.router, prefix=f"{settings.API_V1_STR}/zones", tags=["zones"])
app.include_router(approvals.router, prefix=f"{settings.API_V1_STR}/approvals", tags=["approvals"])
app.include_router(status.router, prefix=f"{settings.API_V1_STR}/status", tags=["status"])
app.include_router(chat.router, prefix=f"{settings.API_V1_STR}/chat", tags=["chat"])
app.include_router(websockets.router, prefix=f"{settings.API_V1_STR}/ws", tags=["websockets"])
app.include_router(mcp_router.router, prefix=f"{settings.API_V1_STR}/mcp", tags=["mcp"])

@app.get("/")
def read_root():
    return {"message": f"Welcome to {settings.PROJECT_NAME} API"}
