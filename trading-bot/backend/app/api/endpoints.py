from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import json

from backend.app.db.database import get_db
from backend.app.db.repository import get_candles

router = APIRouter()
active_connections: List[WebSocket] = []

@router.get("/api/candles/{symbol}")
async def fetch_candles(symbol: str, limit: int = 500, session: AsyncSession = Depends(get_db)):
    candles = await get_candles(session, symbol, limit)
    return candles

@router.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.remove(websocket)

async def broadcast_candle(candle_data: dict):
    disconnected = []
    message = json.dumps({
        "type": "candle_update",
        "data": {
            **candle_data,
            "timestamp": candle_data["timestamp"].isoformat()
        }
    })
    for connection in active_connections:
        try:
            await connection.send_text(message)
        except Exception:
            disconnected.append(connection)
            
    for connection in disconnected:
        active_connections.remove(connection)
