import json
import asyncio
import httpx
import websockets
from datetime import datetime, timezone
from backend.app.data.base_provider import DataProvider
from typing import Callable, Any

class BybitProvider(DataProvider):
    REST_URL = "https://api.bybit.com/v5/market/kline"
    WS_URL = "wss://stream.bybit.com/v5/public/spot"

    async def get_latest_candles(self, symbol: str, timeframe: str, limit: int = 500) -> list[dict[str, Any]]:
        bybit_tf = timeframe.replace('m', '')
        params = {
            "category": "spot",
            "symbol": symbol,
            "interval": bybit_tf,
            "limit": limit
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(self.REST_URL, params=params)
            response.raise_for_status()
            data = response.json()
            
            candles = []
            if data.get("retCode") == 0 and data.get("result", {}).get("list"):
                for item in data["result"]["list"]:
                    candles.append({
                        "symbol": symbol,
                        "timeframe": timeframe,
                        "timestamp": datetime.fromtimestamp(int(item[0]) / 1000, tz=timezone.utc),
                        "open": float(item[1]),
                        "high": float(item[2]),
                        "low": float(item[3]),
                        "close": float(item[4]),
                        "volume": float(item[5])
                    })
            return candles

    async def subscribe_live_candles(self, symbol: str, timeframe: str, callback: Callable):
        bybit_tf = timeframe.replace('m', '')
        topic = f"kline.{bybit_tf}.{symbol}"
        
        while True:
            try:
                async with websockets.connect(self.WS_URL) as ws:
                    subscribe_msg = {
                        "op": "subscribe",
                        "args": [topic]
                    }
                    await ws.send(json.dumps(subscribe_msg))
                    
                    ping_task = asyncio.create_task(self._ping_loop(ws))
                    
                    try:
                        async for message in ws:
                            data = json.loads(message)
                            if "topic" in data and data["topic"] == topic and "data" in data:
                                for item in data["data"]:
                                    candle = {
                                        "symbol": symbol,
                                        "timeframe": timeframe,
                                        "timestamp": datetime.fromtimestamp(item["start"] / 1000, tz=timezone.utc),
                                        "open": float(item["open"]),
                                        "high": float(item["high"]),
                                        "low": float(item["low"]),
                                        "close": float(item["close"]),
                                        "volume": float(item["volume"])
                                    }
                                    await callback(candle)
                    finally:
                        ping_task.cancel()
            except Exception as e:
                print(f"Bybit WS Error: {e}. Reconnecting in 5s...")
                await asyncio.sleep(5)

    async def _ping_loop(self, ws):
        while True:
            try:
                await asyncio.sleep(20)
                await ws.send(json.dumps({"req_id": "ping_1", "op": "ping"}))
            except Exception:
                break
