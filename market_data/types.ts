export interface StandardQuote {
  symbol: string;
  timestamp: number;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  volume: number | null;
  bid: number | null;
  ask: number | null;
  spread: number | null;
  provider: string;
  source_timestamp: number;
  received_timestamp: number;
  is_stale: boolean;
}

export interface StandardCandle {
  symbol: string;
  timeframe: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  provider: string;
  source_timestamp: number;
  received_timestamp: number;
  is_stale: boolean;
}

export interface StandardMarketStatus {
  symbol: string;
  isOpen: boolean;
  session: string; // e.g. "REGULAR", "24/7", "CLOSED", "WEEKEND"
  provider: string;
  received_timestamp: number;
  reason?: string;
}

export interface StandardOrderBookEntry {
  price: number;
  size: number;
}

export interface StandardOrderBook {
  symbol: string;
  bids: StandardOrderBookEntry[];
  asks: StandardOrderBookEntry[];
  provider: string;
  source_timestamp: number;
  received_timestamp: number;
  is_stale: boolean;
}

export interface StandardTrade {
  id: string;
  symbol: string;
  price: number;
  size: number;
  side: "buy" | "sell";
  timestamp: number;
  provider: string;
}

export interface ProviderFetchOptions {
  timeoutMs?: number;
  staleThresholdMs?: number;
}
