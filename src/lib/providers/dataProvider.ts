export interface MarketQuote {
  symbol: string;
  price: number;
  bid?: number;
  ask?: number;
  volume24h?: number;
  change24h?: number;
  timestamp: number;
  provider: string;
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketStatus {
  status: 'OPEN' | 'CLOSED' | 'DEGRADED';
  provider: string;
  latencyMs: number;
  lastUpdated: number;
  details?: string;
}

export interface DataProvider {
  name: string;
  getQuote(symbol: string): Promise<MarketQuote | null>;
  getCandles(symbol: string, timeframe: string, limit?: number): Promise<Candle[]>;
  getMarketStatus(): Promise<MarketStatus>;
}

// Binance Data Provider Implementation
export class BinanceDataProvider implements DataProvider {
  name = 'Binance';

  async getQuote(symbol: string): Promise<MarketQuote | null> {
    const cleanSym = symbol.toUpperCase().replace(/[\/-]/g, '');
    const cryptoSym = cleanSym.endsWith('USDT') ? cleanSym : `${cleanSym}USDT`;
    try {
      const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${cryptoSym}`);
      if (!res.ok) return null;
      const data = await res.json();
      const price = parseFloat(data.lastPrice);
      if (isNaN(price) || price <= 0) return null;
      return {
        symbol: cryptoSym,
        price,
        bid: parseFloat(data.bidPrice) || price,
        ask: parseFloat(data.askPrice) || price,
        volume24h: parseFloat(data.volume) || 0,
        change24h: parseFloat(data.priceChangePercent) || 0,
        timestamp: data.closeTime || Date.now(),
        provider: this.name,
      };
    } catch {
      return null;
    }
  }

  async getCandles(symbol: string, timeframe: string = '15m', limit: number = 100): Promise<Candle[]> {
    const cleanSym = symbol.toUpperCase().replace(/[\/-]/g, '');
    const cryptoSym = cleanSym.endsWith('USDT') ? cleanSym : `${cleanSym}USDT`;
    const tfMap: Record<string, string> = {
      '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
      '1h': '1h', '4h': '4h', '1d': '1d'
    };
    const interval = tfMap[timeframe] || '15m';

    try {
      const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${cryptoSym}&interval=${interval}&limit=${limit}`);
      if (!res.ok) return [];
      const klines = await res.json();
      if (!Array.isArray(klines)) return [];
      return klines.map((k: any) => ({
        timestamp: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }));
    } catch {
      return [];
    }
  }

  async getMarketStatus(): Promise<MarketStatus> {
    const start = Date.now();
    try {
      const res = await fetch('https://api.binance.com/api/v3/ping');
      const latencyMs = Date.now() - start;
      return {
        status: res.ok ? 'OPEN' : 'DEGRADED',
        provider: this.name,
        latencyMs,
        lastUpdated: Date.now(),
      };
    } catch {
      return {
        status: 'CLOSED',
        provider: this.name,
        latencyMs: Date.now() - start,
        lastUpdated: Date.now(),
        details: 'API request failed',
      };
    }
  }
}

// Finnhub Data Provider Implementation
export class FinnhubDataProvider implements DataProvider {
  name = 'Finnhub';
  private apiKey: string;

  constructor(apiKey: string = 'c8651i2ad3i1fq4910s0') {
    this.apiKey = apiKey;
  }

  async getQuote(symbol: string): Promise<MarketQuote | null> {
    const cleanSym = symbol.toUpperCase().replace(/[\/-]/g, '');
    try {
      const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${cleanSym}&token=${this.apiKey}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || !data.c || data.c === 0) return null;
      return {
        symbol: cleanSym,
        price: data.c,
        bid: data.b || data.c,
        ask: data.a || data.c,
        change24h: data.dp || 0,
        timestamp: (data.t ? data.t * 1000 : Date.now()),
        provider: this.name,
      };
    } catch {
      return null;
    }
  }

  async getCandles(): Promise<Candle[]> {
    // Finnhub free candles require timestamp bounds; return empty to fall back to normalized candle source
    return [];
  }

  async getMarketStatus(): Promise<MarketStatus> {
    const start = Date.now();
    try {
      const res = await fetch(`https://finnhub.io/api/v1/market/status?exchange=US&token=${this.apiKey}`);
      const latencyMs = Date.now() - start;
      return {
        status: res.ok ? 'OPEN' : 'DEGRADED',
        provider: this.name,
        latencyMs,
        lastUpdated: Date.now(),
      };
    } catch {
      return {
        status: 'CLOSED',
        provider: this.name,
        latencyMs: Date.now() - start,
        lastUpdated: Date.now(),
      };
    }
  }
}

// Yahoo Finance Data Provider Implementation
export class YahooFinanceDataProvider implements DataProvider {
  name = 'Yahoo Finance';

  async getQuote(symbol: string): Promise<MarketQuote | null> {
    const cleanSym = symbol.toUpperCase().replace(/[\/-]/g, '');
    try {
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${cleanSym}?interval=1m&range=1d`);
      if (!res.ok) return null;
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta || !meta.regularMarketPrice) return null;
      const price = parseFloat(meta.regularMarketPrice);
      return {
        symbol: cleanSym,
        price,
        bid: price,
        ask: price,
        timestamp: Date.now(),
        provider: this.name,
      };
    } catch {
      return null;
    }
  }

  async getCandles(symbol: string, timeframe: string = '15m', limit: number = 100): Promise<Candle[]> {
    const cleanSym = symbol.toUpperCase().replace(/[\/-]/g, '');
    const tfMap: Record<string, { interval: string; range: string }> = {
      '1m': { interval: '1m', range: '1d' },
      '5m': { interval: '5m', range: '5d' },
      '15m': { interval: '15m', range: '5d' },
      '30m': { interval: '30m', range: '10d' },
      '1h': { interval: '60m', range: '1mo' },
      '1d': { interval: '1d', range: '3mo' },
    };
    const config = tfMap[timeframe] || { interval: '15m', range: '5d' };

    try {
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${cleanSym}?interval=${config.interval}&range=${config.range}`);
      if (!res.ok) return [];
      const data = await res.json();
      const result = data?.chart?.result?.[0];
      if (!result) return [];
      const timestamps = result.timestamp || [];
      const quote = result.indicators?.quote?.[0] || {};
      const candles: Candle[] = [];

      for (let i = 0; i < timestamps.length; i++) {
        if (quote.open?.[i] != null && quote.close?.[i] != null) {
          candles.push({
            timestamp: timestamps[i] * 1000,
            open: parseFloat(quote.open[i]),
            high: parseFloat(quote.high[i]),
            low: parseFloat(quote.low[i]),
            close: parseFloat(quote.close[i]),
            volume: parseFloat(quote.volume?.[i] || 0),
          });
        }
      }
      return candles.slice(-limit);
    } catch {
      return [];
    }
  }

  async getMarketStatus(): Promise<MarketStatus> {
    const start = Date.now();
    try {
      const res = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1m&range=1d');
      const latencyMs = Date.now() - start;
      return {
        status: res.ok ? 'OPEN' : 'DEGRADED',
        provider: this.name,
        latencyMs,
        lastUpdated: Date.now(),
      };
    } catch {
      return {
        status: 'CLOSED',
        provider: this.name,
        latencyMs: Date.now() - start,
        lastUpdated: Date.now(),
      };
    }
  }
}

// Unified Composite Provider Manager
export class CompositeDataProviderManager {
  private providers: DataProvider[];

  constructor() {
    this.providers = [
      new BinanceDataProvider(),
      new FinnhubDataProvider(),
      new YahooFinanceDataProvider(),
    ];
  }

  async getQuote(symbol: string): Promise<MarketQuote | null> {
    for (const provider of this.providers) {
      const quote = await provider.getQuote(symbol);
      if (quote && quote.price > 0) return quote;
    }
    return null;
  }

  async getCandles(symbol: string, timeframe: string, limit: number = 100): Promise<Candle[]> {
    for (const provider of this.providers) {
      const candles = await provider.getCandles(symbol, timeframe, limit);
      if (candles && candles.length > 0) return candles;
    }
    return [];
  }

  async getProviderStatuses(): Promise<MarketStatus[]> {
    return Promise.all(this.providers.map(p => p.getMarketStatus()));
  }
}

export const compositeDataProvider = new CompositeDataProviderManager();
