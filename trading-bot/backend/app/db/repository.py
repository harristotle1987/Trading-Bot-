from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

async def upsert_candle(session: AsyncSession, candle: dict):
    """
    Optimized repository logic using SQLAlchemy text queries 
    to insert or update incoming candle streams.
    """
    query = text("""
        INSERT INTO candles (symbol, timeframe, timestamp, open, high, low, close, volume)
        VALUES (:symbol, :timeframe, :timestamp, :open, :high, :low, :close, :volume)
        ON CONFLICT (symbol, timeframe, timestamp) 
        DO UPDATE SET 
            open = EXCLUDED.open,
            high = EXCLUDED.high,
            low = EXCLUDED.low,
            close = EXCLUDED.close,
            volume = EXCLUDED.volume
    """)
    await session.execute(query, candle)
    await session.commit()

async def get_candles(session: AsyncSession, symbol: str, limit: int = 500):
    query = text("""
        SELECT symbol, timeframe, timestamp, open, high, low, close, volume 
        FROM candles 
        WHERE symbol = :symbol 
        ORDER BY timestamp DESC 
        LIMIT :limit
    """)
    result = await session.execute(query, {"symbol": symbol, "limit": limit})
    rows = result.fetchall()
    return [dict(row._mapping) for row in rows][::-1]
