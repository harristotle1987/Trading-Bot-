export * from "./types.js";
export * from "./normalizer.js";
export * from "./base_provider.js";
export * from "./bitget_provider.js";
export * from "./ctrader_provider.js";
export * from "./finnhub_provider.js";
export * from "./fx_provider.js";

import { BitgetMarketDataProvider } from "./bitget_provider.js";
import { CTraderMarketDataProvider } from "./ctrader_provider.js";
import { FinnhubMarketDataProvider } from "./finnhub_provider.js";
import { FxMarketDataProvider } from "./fx_provider.js";
import { BaseMarketDataProvider } from "./base_provider.js";
import { StandardQuote, StandardCandle, StandardMarketStatus } from "./types.js";

export class MarketDataRegistry {
  private providers: Map<string, BaseMarketDataProvider> = new Map();

  constructor() {
    this.register(new BitgetMarketDataProvider());
    this.register(new CTraderMarketDataProvider());
    this.register(new FinnhubMarketDataProvider());
    this.register(new FxMarketDataProvider());
  }

  register(provider: BaseMarketDataProvider) {
    this.providers.set(provider.name, provider);
  }

  getProvider(name: string): BaseMarketDataProvider | undefined {
    return this.providers.get(name);
  }

  getProviderForSymbol(symbol: string): BaseMarketDataProvider {
    const s = symbol.toUpperCase().replace(/[\/-]/g, "");
    if (s.includes("BTC") || s.includes("ETH") || s.includes("SOL") || s.includes("USDT") || s.includes("XRP")) {
      return this.providers.get("bitget")!;
    }
    if (s === "EURUSD" || s === "GBPUSD" || s === "USDJPY" || s.includes("JPY") || s.includes("CAD") || s.includes("AUD")) {
      return this.providers.get("ctrader") || this.providers.get("fx_provider")!;
    }
    return this.providers.get("finnhub")!;
  }

  async getQuote(symbol: string): Promise<StandardQuote> {
    const provider = this.getProviderForSymbol(symbol);
    return provider.get_quote(symbol);
  }

  async getCandles(symbol: string, timeframe: string, limit?: number): Promise<StandardCandle[]> {
    const provider = this.getProviderForSymbol(symbol);
    return provider.get_candles(symbol, timeframe, limit);
  }

  async getMarketStatus(symbol: string): Promise<StandardMarketStatus> {
    const provider = this.getProviderForSymbol(symbol);
    return provider.get_market_status(symbol);
  }
}

export const globalMarketRegistry = new MarketDataRegistry();
