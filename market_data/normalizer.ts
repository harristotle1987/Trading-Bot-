import {
  StandardQuote,
  StandardCandle,
  StandardMarketStatus,
  StandardOrderBook,
  StandardTrade,
  StandardOrderBookEntry
} from "./types.js";

export function cleanSymbolName(symbol: string): string {
  if (!symbol || typeof symbol !== "string") return "UNKNOWN";
  return symbol.trim().toUpperCase().replace(/[\/-]/g, "");
}

export function normalizeQuote(params: {
  symbol: string;
  provider: string;
  close: number;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  volume?: number | null;
  bid?: number | null;
  ask?: number | null;
  spread?: number | null;
  source_timestamp?: number | null;
  received_timestamp?: number;
  staleThresholdMs?: number;
}): StandardQuote {
  const received_timestamp = params.received_timestamp || Date.now();
  const source_timestamp =
    params.source_timestamp && params.source_timestamp > 0
      ? params.source_timestamp
      : received_timestamp;

  const staleThreshold = params.staleThresholdMs || 180000; // 180 seconds default

  const close = typeof params.close === "number" && !isNaN(params.close) ? params.close : 0;
  const open = typeof params.open === "number" && !isNaN(params.open) ? params.open : null;
  const high = typeof params.high === "number" && !isNaN(params.high) ? params.high : null;
  const low = typeof params.low === "number" && !isNaN(params.low) ? params.low : null;
  const volume = typeof params.volume === "number" && !isNaN(params.volume) ? params.volume : null;
  const bid = typeof params.bid === "number" && !isNaN(params.bid) ? params.bid : null;
  const ask = typeof params.ask === "number" && !isNaN(params.ask) ? params.ask : null;

  let spread = typeof params.spread === "number" && !isNaN(params.spread) ? params.spread : null;
  if (spread === null && bid !== null && ask !== null) {
    spread = Math.max(0, parseFloat((ask - bid).toFixed(5)));
  }

  const is_stale =
    received_timestamp - source_timestamp > staleThreshold || source_timestamp <= 0 || close <= 0;

  return {
    symbol: cleanSymbolName(params.symbol),
    timestamp: source_timestamp,
    open,
    high,
    low,
    close,
    volume,
    bid,
    ask,
    spread,
    provider: params.provider,
    source_timestamp,
    received_timestamp,
    is_stale
  };
}

export function normalizeCandle(params: {
  symbol: string;
  timeframe: string;
  provider: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number | null;
  timestamp: number;
  received_timestamp?: number;
  staleThresholdMs?: number;
}): StandardCandle {
  const received_timestamp = params.received_timestamp || Date.now();
  const source_timestamp = params.timestamp && params.timestamp > 0 ? params.timestamp : received_timestamp;
  const staleThreshold = params.staleThresholdMs || 180000;

  const is_stale = received_timestamp - source_timestamp > staleThreshold;

  return {
    symbol: cleanSymbolName(params.symbol),
    timeframe: params.timeframe,
    timestamp: source_timestamp,
    open: typeof params.open === "number" && !isNaN(params.open) ? params.open : 0,
    high: typeof params.high === "number" && !isNaN(params.high) ? params.high : 0,
    low: typeof params.low === "number" && !isNaN(params.low) ? params.low : 0,
    close: typeof params.close === "number" && !isNaN(params.close) ? params.close : 0,
    volume: typeof params.volume === "number" && !isNaN(params.volume) ? params.volume : null,
    provider: params.provider,
    source_timestamp,
    received_timestamp,
    is_stale
  };
}

export function normalizeMarketStatus(params: {
  symbol: string;
  isOpen: boolean;
  session: string;
  provider: string;
  reason?: string;
  received_timestamp?: number;
}): StandardMarketStatus {
  return {
    symbol: cleanSymbolName(params.symbol),
    isOpen: !!params.isOpen,
    session: params.session || "UNKNOWN",
    provider: params.provider,
    received_timestamp: params.received_timestamp || Date.now(),
    reason: params.reason
  };
}

export function normalizeOrderBook(params: {
  symbol: string;
  provider: string;
  bids: Array<[number, number] | { price: number; size: number }>;
  asks: Array<[number, number] | { price: number; size: number }>;
  source_timestamp?: number;
  received_timestamp?: number;
  staleThresholdMs?: number;
}): StandardOrderBook {
  const received_timestamp = params.received_timestamp || Date.now();
  const source_timestamp = params.source_timestamp || received_timestamp;
  const staleThreshold = params.staleThresholdMs || 180000;

  const formatEntries = (
    list: Array<[number, number] | { price: number; size: number }>
  ): StandardOrderBookEntry[] => {
    if (!Array.isArray(list)) return [];
    return list
      .map((item) => {
        if (Array.isArray(item)) {
          return { price: Number(item[0]), size: Number(item[1]) };
        } else if (item && typeof item === "object") {
          return { price: Number(item.price), size: Number(item.size) };
        }
        return null;
      })
      .filter(
        (entry): entry is StandardOrderBookEntry =>
          entry !== null && !isNaN(entry.price) && !isNaN(entry.size)
      );
  };

  return {
    symbol: cleanSymbolName(params.symbol),
    bids: formatEntries(params.bids),
    asks: formatEntries(params.asks),
    provider: params.provider,
    source_timestamp,
    received_timestamp,
    is_stale: received_timestamp - source_timestamp > staleThreshold
  };
}

export function normalizeTrade(params: {
  id: string;
  symbol: string;
  price: number;
  size: number;
  side: "buy" | "sell";
  timestamp: number;
  provider: string;
}): StandardTrade {
  return {
    id: params.id || `trd-${Math.random().toString(36).substring(2, 9)}`,
    symbol: cleanSymbolName(params.symbol),
    price: typeof params.price === "number" && !isNaN(params.price) ? params.price : 0,
    size: typeof params.size === "number" && !isNaN(params.size) ? params.size : 0,
    side: params.side === "sell" ? "sell" : "buy",
    timestamp: params.timestamp || Date.now(),
    provider: params.provider
  };
}
