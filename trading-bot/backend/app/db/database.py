import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base

# Load the database URL from the environment, defaulting to localhost for local dev fallback
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@localhost:5432/tradingbot")

# Highly optimized async connection pooling for high-frequency trading environment
engine = create_async_engine(
    DATABASE_URL,
    echo=False,            # Disable SQL query logging in production for performance
    future=True,
    pool_size=20,          # Base number of persistent connections in the pool
    max_overflow=10,       # Allow up to 10 additional burst connections if pool is exhausted
    pool_timeout=30,       # Seconds to wait before throwing an error if no connection is available
    pool_recycle=1800      # Recycle connections after 30 minutes to prevent stale/dropped connections
)

# Create an optimized async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

Base = declarative_base()

async def get_db():
    """
    Dependency to yield database sessions to FastAPI endpoints or internal tasks.
    Ensures safe release of the connection back to the pool.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
