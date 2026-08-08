import { DEFAULT_MARKET_PRICES } from '../utils/priceUtils';
import { pusherClient } from './pusher';

// Specialized module for Finnhub (Forex)
export const FinnhubModule = {
  async fetchForexPrices(): Promise<Record<string, number>> {
    const prices: Record<string, number> = {};
    const finnhubKey = 'c8651i2ad3i1fq4910s0'; // Safe fallback token
    try {
      const res = await fetch(`https://finnhub.io/api/v1/forex/rates?base=USD&token=${finnhubKey}`);
      if (res.ok) {
        const data = await res.json();
        const quote = data?.quote;
        if (quote) {
          const forexMappings: Record<string, string> = {
            EURUSD: 'EURUSD', GBPUSD: 'GBPUSD', USDJPY: 'USDJPY',
            AUDUSD: 'AUDUSD', USDCAD: 'USDCAD', USDCHF: 'USDCHF',
            NZDUSD: 'NZDUSD', EURGBP: 'EURGBP', EURJPY: 'EURJPY',
            GBPJPY: 'GBPJPY', AUDJPY: 'AUDJPY', EURAUD: 'EURAUD',
            GBPCAD: 'GBPCAD', CADJPY: 'CADJPY', CHFJPY: 'CHFJPY'
          };

          const calc: Record<string, number> = {
            EURUSD: quote.EUR ? 1 / quote.EUR : 1.0852,
            GBPUSD: quote.GBP ? 1 / quote.GBP : 1.2845,
            USDJPY: quote.JPY ? quote.JPY : 154.20,
            AUDUSD: quote.AUD ? 1 / quote.AUD : 0.6582,
            USDCAD: quote.CAD ? quote.CAD : 1.3745,
            USDCHF: quote.CHF ? quote.CHF : 0.8835,
            NZDUSD: quote.NZD ? 1 / quote.NZD : 0.5962,
            EURGBP: (quote.GBP && quote.EUR) ? quote.GBP / quote.EUR : 0.8448,
            EURJPY: (quote.JPY && quote.EUR) ? quote.JPY / quote.EUR : 167.35,
            GBPJPY: (quote.JPY && quote.GBP) ? quote.JPY / quote.GBP : 198.10,
            AUDJPY: (quote.JPY && quote.AUD) ? quote.JPY / quote.AUD : 101.50,
            EURAUD: (quote.AUD && quote.EUR) ? quote.AUD / quote.EUR : 1.6488,
            GBPCAD: (quote.CAD && quote.GBP) ? quote.CAD / quote.GBP : 1.7655,
            CADJPY: (quote.JPY && quote.CAD) ? quote.JPY / quote.CAD : 112.18,
            CHFJPY: (quote.JPY && quote.CHF) ? quote.JPY / quote.CHF : 174.55
          };

          for (const [key, sym] of Object.entries(forexMappings)) {
            if (calc[key]) {
              const val = calc[key];
              prices[sym] = val;
              prices[`${sym}-OTC`] = val;
              prices[`${sym} (OTC)`] = val;
              // Clean form with slash
              const withSlash = `${sym.slice(0, 3)}/${sym.slice(3)}`;
              prices[withSlash] = val;
              prices[`${withSlash} (OTC)`] = val;
            }
          }
        }
      }
    } catch (e) {
      console.warn('[FinnhubModule] Direct forex fetch failed, will use backend fallback:', e);
    }
    return prices;
  }
};

// Specialized module for Bitget (Crypto)
export const BitgetModule = {
  async fetchCryptoPrices(): Promise<Record<string, number>> {
    const prices: Record<string, number> = {};
    const cryptoSymbols = [
      "BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "BNBUSDT",
      "ADAUSDT", "DOGEUSDT", "AVAXUSDT", "LINKUSDT", "DOTUSDT",
      "NEARUSDT", "SUIUSDT", "APTUSDT", "MATICUSDT", "LTCUSDT",
      "UNIUSDT", "ATOMUSDT", "ETCUSDT", "FILUSDT", "ARBUSDT"
    ];
    try {
      const res = await fetch("https://api.bitget.com/api/v2/spot/market/tickers");
      if (res.ok) {
        const responseData = await res.json();
        if (responseData?.data && Array.isArray(responseData.data)) {
          for (const s of cryptoSymbols) {
            const ticker = responseData.data.find((t: any) => t.symbol === s);
            if (ticker && ticker.lastPr) {
              const price = parseFloat(ticker.lastPr);
              prices[s] = price;
              prices[s.replace("USDT", "")] = price;
              prices[`${s.slice(0, -4)}/USDT`] = price;
            }
          }
        }
      }
    } catch (e) {
      console.warn('[BitgetModule] Direct crypto fetch failed, will use backend fallback:', e);
    }
    return prices;
  }
};

// Specialized module for ExchangeRate-API (Stocks/Fallback)
export const ExchangeRateModule = {
  async fetchStockPrices(): Promise<Record<string, number>> {
    const prices: Record<string, number> = {};
    const stockSymbols = ["AAPL", "MSFT", "TSLA", "AMZN", "GOOGL", "NVDA", "META", "AMD", "NFLX", "PLTR", "COIN"];
    // Since direct stock feeds are highly restricted by CORS, we use fallback/mock shifts
    // or query public endpoints. We will fetch Yahoo Finance equivalent via our own backend or fallbacks.
    for (const s of stockSymbols) {
      try {
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${s}?interval=1m&range=1d`);
        if (res.ok) {
          const data = await res.json();
          const meta = data?.chart?.result?.[0]?.meta;
          if (meta && meta.regularMarketPrice) {
            const price = parseFloat(meta.regularMarketPrice);
            prices[s] = price;
            prices[`${s} (Stock)`] = price;
          }
        }
      } catch (_) {
        // Fallback to slight fluctuation from base
        const base = DEFAULT_MARKET_PRICES[s] || 100;
        const price = base + (Math.random() - 0.5) * (base * 0.001);
        prices[s] = parseFloat(price.toFixed(2));
        prices[`${s} (Stock)`] = parseFloat(price.toFixed(2));
      }
    }
    return prices;
  }
};

// Centralized market data store & event dispatcher
class MarketDataService {
  private prices: Record<string, number> = { ...DEFAULT_MARKET_PRICES };
  private subscribers = new Set<(prices: Record<string, number>) => void>();
  private isPolling = false;
  private pollIntervalId: any = null;

  constructor() {
    this.initPusher();
    this.startPolling();
  }

  // Hook into real-time updates via Pusher
  private initPusher() {
    if (pusherClient) {
      const channel = pusherClient.subscribe('trading-bot');
      channel.bind('market-update', (data: any) => {
        if (data?.prices) {
          this.updatePrices(data.prices);
        }
      });
    }
  }

  // Retrieve current in-memory prices
  public getPrices(): Record<string, number> {
    return this.prices;
  }

  // Subscribe to real-time price updates (DOM nodes can subscribe directly)
  public subscribe(callback: (prices: Record<string, number>) => void): () => void {
    this.subscribers.add(callback);
    // Trigger instantly with current prices on subscription
    callback(this.prices);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  // Update in-memory storage and notify all subscribers
  public updatePrices(newPrices: Record<string, number>) {
    let hasChanged = false;
    for (const [key, val] of Object.entries(newPrices)) {
      if (this.prices[key] !== val && typeof val === 'number' && !isNaN(val) && val > 0) {
        this.prices[key] = val;
        hasChanged = true;
      }
    }
    if (hasChanged) {
      this.notifySubscribers();
    }
  }

  private notifySubscribers() {
    this.subscribers.forEach(cb => {
      try {
        cb(this.prices);
      } catch (err) {
        console.error('[MarketDataService] Subscriber error:', err);
      }
    });
  }

  // Poll specialized modules and aggregate results
  public async fetchAllPrices() {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      // Run specialized module fetches in parallel
      const [forex, crypto, stocks] = await Promise.all([
        FinnhubModule.fetchForexPrices(),
        BitgetModule.fetchCryptoPrices(),
        ExchangeRateModule.fetchStockPrices()
      ]);

      const merged = { ...forex, ...crypto, ...stocks };

      // Always fetch from backend to resolve potential client CORS/network blocks and sync system-wide
      try {
        const res = await fetch('/api/market/prices', { cache: 'no-store' });
        if (res.ok) {
          const backendPrices = await res.json();
          if (backendPrices && typeof backendPrices === 'object') {
            Object.assign(merged, backendPrices);
          }
        }
      } catch (e) {
        // Backend offline or error, continue with direct merged prices
      }

      this.updatePrices(merged);
    } catch (err) {
      console.warn('[MarketDataService] Aggregated fetch failed:', err);
    } finally {
      this.isPolling = false;
    }
  }

  // Start periodic sync polling
  private startPolling() {
    this.fetchAllPrices();
    if (this.pollIntervalId) clearInterval(this.pollIntervalId);
    this.pollIntervalId = setInterval(() => {
      this.fetchAllPrices();
    }, 2500);
  }

  public destroy() {
    if (this.pollIntervalId) clearInterval(this.pollIntervalId);
    if (pusherClient) {
      pusherClient.unsubscribe('trading-bot');
    }
  }
}

export const marketDataService = new MarketDataService();
