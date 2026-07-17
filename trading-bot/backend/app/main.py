from fastapi import FastAPI
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    print("Initializing Trading Bot System...")
    yield
    # Shutdown logic
    print("Shutting down Trading Bot System...")

app = FastAPI(
    title="Trading Bot API",
    description="Backend API for the Private Trading Bot System",
    version="1.0.0",
    lifespan=lifespan,
)

@app.get("/health")
async def health_check():
    """Health check endpoint to verify system status."""
    return {"status": "ok"}
