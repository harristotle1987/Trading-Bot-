import {
  StandardQuote,
  StandardCandle,
  StandardMarketStatus,
  StandardOrderBook,
  StandardTrade
} from "./types.js";

export abstract class BaseMarketDataProvider {
  abstract readonly name: string;
  timeoutMs: number = 5000;
  staleThresholdMs: number = 180000; // 3 minutes

  abstract get_quote(symbol: string): Promise<StandardQuote>;
  abstract get_candles(symbol: string, timeframe: string, limit?: number): Promise<StandardCandle[]>;
  abstract get_market_status(symbol: string): Promise<StandardMarketStatus>;

  // Where available - default implementation returns null (no synthetic data)
  async get_order_book(symbol: string): Promise<StandardOrderBook | null> {
    return null;
  }

  async get_trades(symbol: string): Promise<StandardTrade[] | null> {
    return null;
  }

  protected createTimeoutSignal(customTimeoutMs?: number): AbortSignal {
    const ms = customTimeoutMs || this.timeoutMs;
    return AbortSignal.timeout(ms);
  }
}
