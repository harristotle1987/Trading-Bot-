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

export class FxMarketDataProvider extends BaseMarketDataProvider {
  readonly name = "fx_provider";
  private primaryUrl = "https://open.er-api.com/v6/latest/USD";
  private fallbackUrl = "https://api.exchangerate-api.com/v4/latest/USD";

  private computeRate(rates: Record<string, number>, cleanSym: string): number | null {
    if (!rates || typeof rates !== "object") return null;

    if (cleanSym === "EURUSD" && rates.EUR) return parseFloat((1 / rates.EUR).toFixed(5));
    if (cleanSym === "GBPUSD" && rates.GBP) return parseFloat((1 / rates.GBP).toFixed(5));
    if (cleanSym === "USDJPY" && rates.JPY) return parseFloat(rates.JPY.toFixed(2));
    if (cleanSym === "AUDUSD" && rates.AUD) return parseFloat((1 / rates.AUD).toFixed(5));
    if (cleanSym === "USDCAD" && rates.CAD) return parseFloat(rates.CAD.toFixed(5));
    if (cleanSym === "USDCHF" && rates.CHF) return parseFloat(rates.CHF.toFixed(5));
    if (cleanSym === "NZDUSD" && rates.NZD) return parseFloat((1 / rates.NZD).toFixed(5));
    if (cleanSym === "EURGBP" && rates.EUR && rates.GBP) return parseFloat((rates.GBP / rates.EUR).toFixed(5));
    if (cleanSym === "EURJPY" && rates.EUR && rates.JPY) return parseFloat((rates.JPY / rates.EUR).toFixed(2));
    if (cleanSym === "GBPJPY" && rates.GBP && rates.JPY) return parseFloat((rates.JPY / rates.GBP).toFixed(2));

    // Direct base/quote breakdown if symbol is 6 chars e.g. "EURAUD"
    if (cleanSym.length === 6) {
      const base = cleanSym.substring(0, 3);
      const quote = cleanSym.substring(3, 6);

      if (base === "USD" && rates[quote]) {
        return parseFloat(rates[quote].toFixed(quote.includes("JPY") ? 2 : 5));
      }
      if (quote === "USD" && rates[base]) {
        return parseFloat((1 / rates[base]).toFixed(base.includes("JPY") ? 2 : 5));
      }
      if (rates[base] && rates[quote]) {
        const usdBase = 1 / rates[base];
        const usdQuote = 1 / rates[quote];
        const rate = usdBase / usdQuote;
        return parseFloat(rate.toFixed(cleanSym.includes("JPY") ? 2 : 5));
      }
    }

    return null;
  }

  async get_quote(symbol: string): Promise<StandardQuote> {
    const cleanSym = cleanSymbolName(symbol);
    const received_timestamp = Date.now();

    try {
      let res = await fetch(this.primaryUrl, { signal: this.createTimeoutSignal() });
      if (!res.ok) {
        res = await fetch(this.fallbackUrl, { signal: this.createTimeoutSignal() });
      }
      if (!res.ok) {
        throw new Error(`HTTP_${res.status}_${res.statusText}`);
      }

      const json = await res.json();
      const rates = json.rates || json.conversion_rates;
      const rate = this.computeRate(rates, cleanSym);

      if (!rate || isNaN(rate) || rate <= 0) {
        throw new Error(`UNSUPPORTED_FX_PAIR_${cleanSym}`);
      }

      const source_timestamp = json.time_last_update_unix
        ? json.time_last_update_unix * 1000
        : received_timestamp;

      // Estimate indicative spread (0.1 - 0.5 pips)
      const pip = cleanSym.includes("JPY") ? 0.01 : 0.0001;
      const bid = parseFloat((rate - 0.5 * pip).toFixed(cleanSym.includes("JPY") ? 2 : 5));
      const ask = parseFloat((rate + 0.5 * pip).toFixed(cleanSym.includes("JPY") ? 2 : 5));

      return normalizeQuote({
        symbol: cleanSym,
        provider: this.name,
        close: rate,
        open: rate,
        high: rate + pip,
        low: rate - pip,
        volume: null,
        bid,
        ask,
        source_timestamp,
        received_timestamp,
        staleThresholdMs: this.staleThresholdMs
      });
    } catch (err: any) {
      throw new Error(`[FxProvider] get_quote failed for ${cleanSym}: ${err.message}`);
    }
  }

  async get_candles(symbol: string, timeframe: string, limit: number = 20): Promise<StandardCandle[]> {
    const quote = await this.get_quote(symbol);
    const now = Date.now();
    const intervalMs = 60000; // 1 minute default
    const candles: StandardCandle[] = [];

    for (let i = limit - 1; i >= 0; i--) {
      const ts = now - i * intervalMs;
      candles.push(
        normalizeCandle({
          symbol: quote.symbol,
          timeframe,
          provider: this.name,
          open: quote.close,
          high: quote.high || quote.close,
          low: quote.low || quote.close,
          close: quote.close,
          volume: null,
          timestamp: ts,
          received_timestamp: now,
          staleThresholdMs: this.staleThresholdMs
        })
      );
    }
    return candles;
  }

  async get_market_status(symbol: string): Promise<StandardMarketStatus> {
    const cleanSym = cleanSymbolName(symbol);
    const day = new Date().getUTCDay();
    const isWeekend = day === 0 || day === 6;

    if (isWeekend) {
      return normalizeMarketStatus({
        symbol: cleanSym,
        isOpen: false,
        session: "WEEKEND",
        provider: this.name,
        reason: "Forex markets are closed on weekends."
      });
    }

    return normalizeMarketStatus({
      symbol: cleanSym,
      isOpen: true,
      session: "24/5",
      provider: this.name
    });
  }

  async get_order_book(symbol: string): Promise<StandardOrderBook | null> {
    return null;
  }

  async get_trades(symbol: string): Promise<StandardTrade[] | null> {
    return null;
  }
}
