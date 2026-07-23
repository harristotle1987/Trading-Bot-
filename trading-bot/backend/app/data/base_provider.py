from abc import ABC, abstractmethod
from typing import Callable, Any

class DataProvider(ABC):
    @abstractmethod
    async def get_latest_candles(self, symbol: str, timeframe: str, limit: int) -> list[dict[str, Any]]:
        """Fetch historical candles via REST API."""
        pass

    @abstractmethod
    async def subscribe_live_candles(self, symbol: str, timeframe: str, callback: Callable):
        """Subscribe to live candles via WebSocket stream."""
        pass
