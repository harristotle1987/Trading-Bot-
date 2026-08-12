import { BaseMarketDataProvider } from "./base_provider.js";
import {
  StandardQuote,
  StandardCandle,
  StandardMarketStatus,
  StandardOrderBook,
  StandardTrade
} from "./types.js";
import {
  cleanSymbolName,
  normalizeQuote,
  normalizeCandle,
  normalizeMarketStatus
} from "./normalizer.js";

export class FinnhubMarketDataProvider extends BaseMarketDataProvider {
  readonly name = "finnhub";
  private baseUrl = "https://finnhub.io/api/v1";
  private defaultApiKey = "c8651i2ad3i1fq4910s0";

  private getApiKey(): string {
    return process.env.FINNHUB_API_KEY || this.defaultApiKey;
  }

  private mapResolution(timeframe: string): string {
    const tf = timeframe.toLowerCase().trim();
    switch (tf) {
      case "1m":
        return "1";
      case "5m":
        return "5";
      case "15m":
        return "15";
      case "30m":
        return "30";
      case "1h":
        return "60";
      case "1d":
        return "D";
      default:
        return "15";
    }
  }

  async get_quote(symbol: string): Promise<StandardQuote> {
    const cleanSym = cleanSymbolName(symbol);
    const token = this.getApiKey();
    const url = `${this.baseUrl}/quote?symbol=${cleanSym}&token=${token}`;
    const received_timestamp = Date.now();

    try {
      const res = await fetch(url, { signal: this.createTimeoutSignal() });
      if (!res.ok) {
        throw new Error(`HTTP_${res.status}_${res.statusText}`);
      }
      const data = await res.json();
      if (!data || typeof data.c !== "number" || data.c <= 0) {
        throw new Error(`INVALID_QUOTE_DATA_FOR_${cleanSym}`);
      }

      const close = data.c;
      const open = typeof data.o === "number" && data.o > 0 ? data.o : null;
      const high = typeof data.h === "number" && data.h > 0 ? data.h : null;
      const low = typeof data.l === "number" && data.l > 0 ? data.l : null;
      const source_timestamp = data.t ? data.t * 1000 : received_timestamp;

      return normalizeQuote({
        symbol: cleanSym,
        provider: this.name,
        close,
        open,
        high,
        low,
        volume: null, // Finnhub quote does not provide volume
        bid: null,
        ask: null,
        source_timestamp,
        received_timestamp,
        staleThresholdMs: this.staleThresholdMs
      });
    } catch (err: any) {
      throw new Error(`[FinnhubProvider] get_quote failed for ${cleanSym}: ${err.message}`);
    }
  }

  async get_candles(symbol: string, timeframe: string, limit: number = 50): Promise<StandardCandle[]> {
    const cleanSym = cleanSymbolName(symbol);
    const token = this.getApiKey();
    const res = this.mapResolution(timeframe);

    const nowSec = Math.floor(Date.now() / 1000);
    const lookbackSec = limit * 60 * (res === "D" ? 1440 : Number(res) || 15);
    const fromSec = nowSec - lookbackSec;

    const url = `${this.baseUrl}/stock/candle?symbol=${cleanSym}&resolution=${res}&from=${fromSec}&to=${nowSec}&token=${token}`;
    const received_timestamp = Date.now();

    try {
      const fetchRes = await fetch(url, { signal: this.createTimeoutSignal() });
      if (!fetchRes.ok) {
        throw new Error(`HTTP_${fetchRes.status}_${fetchRes.statusText}`);
      }
      const data = await fetchRes.json();
      if (!data || data.s !== "ok" || !Array.isArray(data.c)) {
        throw new Error(`NO_CANDLES_RETURNED_${cleanSym}`);
      }

      const count = data.c.length;
      const result: StandardCandle[] = [];
      for (let i = 0; i < count; i++) {
        result.push(
          normalizeCandle({
            symbol: cleanSym,
            timeframe,
            provider: this.name,
            open: data.o[i],
            high: data.h[i],
            low: data.l[i],
            close: data.c[i],
            volume: data.v ? data.v[i] : null,
            timestamp: data.t[i] * 1000,
            received_timestamp,
            staleThresholdMs: this.staleThresholdMs
          })
        );
      }
      return result;
    } catch (err: any) {
      throw new Error(`[FinnhubProvider] get_candles failed for ${cleanSym}: ${err.message}`);
    }
  }

  async get_market_status(symbol: string): Promise<StandardMarketStatus> {
    const cleanSym = cleanSymbolName(symbol);
    const date = new Date();
    const day = date.getUTCDay();
    const isWeekend = day === 0 || day === 6;

    if (isWeekend) {
      return normalizeMarketStatus({
        symbol: cleanSym,
        isOpen: false,
        session: "WEEKEND",
        provider: this.name,
        reason: "Stock market is closed on weekends."
      });
    }

    return normalizeMarketStatus({
      symbol: cleanSym,
      isOpen: true,
      session: "REGULAR",
      provider: this.name
    });
  }

  // Finnhub free tier quote API does NOT support order book or live trades -> Return null
  async get_order_book(symbol: string): Promise<StandardOrderBook | null> {
    return null;
  }

  async get_trades(symbol: string): Promise<StandardTrade[] | null> {
    return null;
  }
}
