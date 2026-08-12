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
  normalizeMarketStatus,
  normalizeOrderBook,
  normalizeTrade
} from "./normalizer.js";

export class BitgetMarketDataProvider extends BaseMarketDataProvider {
  readonly name = "bitget";
  private baseUrl = "https://api.bitget.com";

  private mapTimeframe(timeframe: string): string {
    const tf = timeframe.toLowerCase().trim();
    switch (tf) {
      case "1m":
        return "1min";
      case "5m":
        return "5min";
      case "15m":
        return "15min";
      case "30m":
        return "30min";
      case "1h":
        return "1h";
      case "4h":
        return "4h";
      case "1d":
        return "1day";
      default:
        return "15min";
    }
  }

  async get_quote(symbol: string): Promise<StandardQuote> {
    const cleanSym = cleanSymbolName(symbol);
    const url = `${this.baseUrl}/api/v2/spot/market/tickers?symbol=${cleanSym}`;
    const received_timestamp = Date.now();

    try {
      const res = await fetch(url, { signal: this.createTimeoutSignal() });
      if (!res.ok) {
        throw new Error(`HTTP_${res.status}_${res.statusText}`);
      }
      const json = await res.json();
      if (!json || !Array.isArray(json.data) || json.data.length === 0) {
        throw new Error(`NO_DATA_FOR_SYMBOL_${cleanSym}`);
      }

      const ticker = json.data[0];
      const close = parseFloat(ticker.lastPr || ticker.closePrice || "0");
      if (isNaN(close) || close <= 0) {
        throw new Error(`INVALID_PRICE_${cleanSym}`);
      }

      const open = ticker.open24h ? parseFloat(ticker.open24h) : null;
      const high = ticker.high24h ? parseFloat(ticker.high24h) : null;
      const low = ticker.low24h ? parseFloat(ticker.low24h) : null;
      const volume = ticker.baseVolume ? parseFloat(ticker.baseVolume) : null;
      const bid = ticker.bidPr ? parseFloat(ticker.bidPr) : null;
      const ask = ticker.askPr ? parseFloat(ticker.askPr) : null;
      const source_timestamp = ticker.ts ? Number(ticker.ts) : received_timestamp;

      return normalizeQuote({
        symbol: cleanSym,
        provider: this.name,
        close,
        open,
        high,
        low,
        volume,
        bid,
        ask,
        source_timestamp,
        received_timestamp,
        staleThresholdMs: this.staleThresholdMs
      });
    } catch (err: any) {
      throw new Error(`[BitgetProvider] get_quote failed for ${cleanSym}: ${err.message}`);
    }
  }

  async get_candles(symbol: string, timeframe: string, limit: number = 100): Promise<StandardCandle[]> {
    const cleanSym = cleanSymbolName(symbol);
    const granularity = this.mapTimeframe(timeframe);
    const url = `${this.baseUrl}/api/v2/spot/market/candles?symbol=${cleanSym}&granularity=${granularity}&limit=${limit}`;
    const received_timestamp = Date.now();

    try {
      const res = await fetch(url, { signal: this.createTimeoutSignal() });
      if (!res.ok) {
        throw new Error(`HTTP_${res.status}_${res.statusText}`);
      }
      const json = await res.json();
      if (!json || !Array.isArray(json.data)) {
        throw new Error(`INVALID_CANDLE_RESPONSE_${cleanSym}`);
      }

      return json.data.map((item: any) => {
        // [ts, open, high, low, close, baseVol, quoteVol]
        const timestamp = Number(item[0]);
        const open = parseFloat(item[1]);
        const high = parseFloat(item[2]);
        const low = parseFloat(item[3]);
        const close = parseFloat(item[4]);
        const volume = item[5] ? parseFloat(item[5]) : null;

        return normalizeCandle({
          symbol: cleanSym,
          timeframe,
          provider: this.name,
          open,
          high,
          low,
          close,
          volume,
          timestamp,
          received_timestamp,
          staleThresholdMs: this.staleThresholdMs
        });
      });
    } catch (err: any) {
      throw new Error(`[BitgetProvider] get_candles failed for ${cleanSym}: ${err.message}`);
    }
  }

  async get_market_status(symbol: string): Promise<StandardMarketStatus> {
    const cleanSym = cleanSymbolName(symbol);
    return normalizeMarketStatus({
      symbol: cleanSym,
      isOpen: true,
      session: "24/7",
      provider: this.name
    });
  }

  async get_order_book(symbol: string): Promise<StandardOrderBook | null> {
    const cleanSym = cleanSymbolName(symbol);
    const url = `${this.baseUrl}/api/v2/spot/market/orderbook?symbol=${cleanSym}&type=step0&limit=15`;
    const received_timestamp = Date.now();

    try {
      const res = await fetch(url, { signal: this.createTimeoutSignal() });
      if (!res.ok) return null;
      const json = await res.json();
      if (!json || !json.data) return null;

      const bids = json.data.bids || [];
      const asks = json.data.asks || [];
      const source_timestamp = json.data.ts ? Number(json.data.ts) : received_timestamp;

      return normalizeOrderBook({
        symbol: cleanSym,
        provider: this.name,
        bids,
        asks,
        source_timestamp,
        received_timestamp,
        staleThresholdMs: this.staleThresholdMs
      });
    } catch (_) {
      return null;
    }
  }

  async get_trades(symbol: string): Promise<StandardTrade[] | null> {
    const cleanSym = cleanSymbolName(symbol);
    const url = `${this.baseUrl}/api/v2/spot/market/fills?symbol=${cleanSym}&limit=20`;

    try {
      const res = await fetch(url, { signal: this.createTimeoutSignal() });
      if (!res.ok) return null;
      const json = await res.json();
      if (!json || !Array.isArray(json.data)) return null;

      return json.data.map((item: any) =>
        normalizeTrade({
          id: String(item.tradeId || item.fillId || item.ts),
          symbol: cleanSym,
          price: parseFloat(item.price || "0"),
          size: parseFloat(item.size || "0"),
          side: item.side === "sell" ? "sell" : "buy",
          timestamp: Number(item.ts || Date.now()),
          provider: this.name
        })
      );
    } catch (_) {
      return null;
    }
  }
}
