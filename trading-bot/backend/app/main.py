from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from backend.app.api.endpoints import router, broadcast_candle
from backend.app.api.risk import router as risk_router
from backend.app.execution.router import router as execution_router
from backend.app.backtest.router import router as backtest_router
from backend.app.data.bybit_provider import BybitProvider
from backend.app.db.database import AsyncSessionLocal
from backend.app.db.repository import upsert_candle
import asyncio

bg_tasks = set()

async def run_bybit_stream():
    provider = BybitProvider()
    
    # 1. Backfill historical data on startup
    print("Starting Bybit historical backfill for BTCUSDT...")
    try:
        candles = await provider.get_latest_candles("BTCUSDT", "1", limit=500)
        async with AsyncSessionLocal() as session:
            for candle in candles:
                await upsert_candle(session, candle)
        print(f"Backfill complete. Inserted {len(candles)} candles.")
    except Exception as e:
        print(f"Backfill error: {e}")

    # 2. Subscribe to live WebSocket data
    async def handle_live_candle(candle):
        async with AsyncSessionLocal() as session:
            await upsert_candle(session, candle)
        await broadcast_candle(candle)
        
    print("Subscribing to Bybit live WebSocket stream...")
    await provider.subscribe_live_candles("BTCUSDT", "1", handle_live_candle)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    print("Initializing Trading Bot System...")
    task = asyncio.create_task(run_bybit_stream())
    bg_tasks.add(task)
    yield
    # Shutdown logic
    print("Shutting down Trading Bot System...")
    for task in bg_tasks:
        task.cancel()

app = FastAPI(
    title="Trading Bot API",
    description="Backend API for the Private Trading Bot System",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(risk_router, prefix="/api/risk", tags=["risk"])
app.include_router(execution_router, prefix="/api/execution", tags=["execution"])
app.include_router(backtest_router, prefix="/api/backtest", tags=["backtest"])

@app.get("/health")
async def health_check():
    """Health check endpoint to verify system status."""
    return {"status": "ok"}
