import { FeatureSet } from "./featureEngine.js";
import { MarketRegimeType } from "./regimeClassifier.js";

export type StrategyDirection = "BUY" | "SELL" | "HOLD";

export interface StrategyEvaluation {
  direction: StrategyDirection;
  confidence: number; // 0.0 to 1.0
  reason: string;
  entry_reference: number | null;
  invalidation_reference: number | null;
  strategy_name: string;
  strategy_version: string;
}

export interface BaseStrategy {
  strategy_name: string;
  strategy_version: string;
  evaluate(features: FeatureSet, regime: MarketRegimeType): StrategyEvaluation;
}

// =========================================================================
// 1. TREND FOLLOWING STRATEGY
// =========================================================================
export class TrendFollowingStrategy implements BaseStrategy {
  strategy_name = "Trend Following (EMA Stack Rider)";
  strategy_version = "1.0.0";

  evaluate(features: FeatureSet, regime: MarketRegimeType): StrategyEvaluation {
    const { trend, multiTimeframe } = features;
    const currentPrice = features.volatility.bbMiddle ?? 100; // default benchmark price

    // Default return
    const evaluation: StrategyEvaluation = {
      direction: "HOLD",
      confidence: 0.0,
      reason: "No strong trend following setup identified.",
      entry_reference: null,
      invalidation_reference: null,
      strategy_name: this.strategy_name,
      strategy_version: this.strategy_version
    };

    // Require a trending regime to deploy
    if (regime !== "TRENDING_BULLISH" && regime !== "TRENDING_BEARISH") {
      evaluation.reason = `Strategy inactive in non-trending regime: ${regime}`;
      return evaluation;
    }

    if (regime === "TRENDING_BULLISH") {
      let score = 0.5;
      const points: string[] = ["Trending Bullish Regime identified"];

      if (trend.isBullishEMAStack) {
        score += 0.2;
        points.push("EMAs stacked bullishly (20 > 50 > 100 > 200)");
      }
      if (trend.ema20_slope !== null && trend.ema20_slope > 0) {
        score += 0.1;
        points.push(`Positive EMA20 slope (${(trend.ema20_slope * 100).toFixed(2)}%)`);
      }
      if (multiTimeframe.higherTimeframeTrend === "bullish") {
        score += 0.15;
        points.push("Higher timeframe trend is bullish");
      }

      evaluation.direction = "BUY";
      evaluation.confidence = parseFloat(Math.min(0.95, score).toFixed(2));
      evaluation.reason = points.join(" | ");
      evaluation.entry_reference = trend.ema20 ?? currentPrice;
      evaluation.invalidation_reference = trend.ema200 ?? (currentPrice * 0.98);
    } else if (regime === "TRENDING_BEARISH") {
      let score = 0.5;
      const points: string[] = ["Trending Bearish Regime identified"];

      // Bearish EMA check
      const isBearishEMA =
        trend.ema20 !== null &&
        trend.ema50 !== null &&
        trend.ema100 !== null &&
        trend.ema200 !== null &&
        trend.ema20 < trend.ema50 &&
        trend.ema50 < trend.ema100 &&
        trend.ema100 < trend.ema200;

      if (isBearishEMA) {
        score += 0.2;
        points.push("EMAs stacked bearishly (20 < 50 < 100 < 200)");
      }
      if (trend.ema20_slope !== null && trend.ema20_slope < 0) {
        score += 0.1;
        points.push(`Negative EMA20 slope (${(trend.ema20_slope * 100).toFixed(2)}%)`);
      }
      if (multiTimeframe.higherTimeframeTrend === "bearish") {
        score += 0.15;
        points.push("Higher timeframe trend is bearish");
      }

      evaluation.direction = "SELL";
      evaluation.confidence = parseFloat(Math.min(0.95, score).toFixed(2));
      evaluation.reason = points.join(" | ");
      evaluation.entry_reference = trend.ema20 ?? currentPrice;
      evaluation.invalidation_reference = trend.ema200 ?? (currentPrice * 1.02);
    }

    return evaluation;
  }
}

// =========================================================================
// 2. MOMENTUM STRATEGY
// =========================================================================
export class MomentumStrategy implements BaseStrategy {
  strategy_name = "Momentum (Zero-Lag MACD & RSI)";
  strategy_version = "1.0.0";

  evaluate(features: FeatureSet, _regime: MarketRegimeType): StrategyEvaluation {
    const { momentum } = features;
    const currentPrice = features.volatility.bbMiddle ?? 100;

    const evaluation: StrategyEvaluation = {
      direction: "HOLD",
      confidence: 0.0,
      reason: "No high-velocity momentum setup detected.",
      entry_reference: null,
      invalidation_reference: null,
      strategy_name: this.strategy_name,
      strategy_version: this.strategy_version
    };

    if (momentum.rsi === null || momentum.macdHistogram === null) {
      evaluation.reason = "Insufficient momentum features for evaluation.";
      return evaluation;
    }

    // Bullish momentum: RSI between 50 and 70 (strong but not exhausted) and positive MACD histogram
    if (momentum.rsi > 50 && momentum.rsi < 70 && momentum.macdHistogram > 0) {
      let score = 0.6;
      const points = [`RSI holds healthy bullish territory (${momentum.rsi.toFixed(1)})`, "MACD Histogram is positive"];

      if (momentum.roc !== null && momentum.roc > 0) {
        score += 0.15;
        points.push(`Rate of Change is positive (${momentum.roc.toFixed(2)}%)`);
      }

      evaluation.direction = "BUY";
      evaluation.confidence = parseFloat(Math.min(0.95, score).toFixed(2));
      evaluation.reason = points.join(" | ");
      evaluation.entry_reference = currentPrice;
      evaluation.invalidation_reference = currentPrice * 0.985;
    } 
    // Bearish momentum: RSI between 30 and 50 (weak but not exhausted) and negative MACD histogram
    else if (momentum.rsi < 50 && momentum.rsi > 30 && momentum.macdHistogram < 0) {
      let score = 0.6;
      const points = [`RSI in bearish momentum territory (${momentum.rsi.toFixed(1)})`, "MACD Histogram is negative"];

      if (momentum.roc !== null && momentum.roc < 0) {
        score += 0.15;
        points.push(`Rate of Change is negative (${momentum.roc.toFixed(2)}%)`);
      }

      evaluation.direction = "SELL";
      evaluation.confidence = parseFloat(Math.min(0.95, score).toFixed(2));
      evaluation.reason = points.join(" | ");
      evaluation.entry_reference = currentPrice;
      evaluation.invalidation_reference = currentPrice * 1.015;
    }

    return evaluation;
  }
}

// =========================================================================
// 3. BREAKOUT STRATEGY
// =========================================================================
export class BreakoutStrategy implements BaseStrategy {
  strategy_name = "Intraday Breakout (H1/H4 Trend Rider)";
  strategy_version = "1.0.0";

  evaluate(features: FeatureSet, regime: MarketRegimeType): StrategyEvaluation {
    const { structure, volume } = features;
    const currentPrice = features.volatility.bbMiddle ?? 100;

    const evaluation: StrategyEvaluation = {
      direction: "HOLD",
      confidence: 0.0,
      reason: "No boundary breakout setups identified.",
      entry_reference: null,
      invalidation_reference: null,
      strategy_name: this.strategy_name,
      strategy_version: this.strategy_version
    };

    if (regime !== "BREAKOUT") {
      evaluation.reason = `Breakout strategy inactive in ranging/stable regime: ${regime}`;
      return evaluation;
    }

    if (volume.relativeVolume === null || volume.relativeVolume < 1.5) {
      evaluation.reason = "Breakout candidate flagged, but relative volume is insufficient to confirm.";
      return evaluation;
    }

    // Distances
    const distRes = structure.distanceToResistance;
    const distSup = structure.distanceToSupport;

    if (distRes !== null && distRes < 0.005) {
      evaluation.direction = "BUY";
      evaluation.confidence = parseFloat(Math.min(0.95, 0.6 + (volume.relativeVolume - 1.5) * 0.1).toFixed(2));
      evaluation.reason = `Bullish Breakout confirmed by relative volume (${volume.relativeVolume.toFixed(2)}x) near Resistance`;
      evaluation.entry_reference = structure.swingHigh ?? currentPrice;
      evaluation.invalidation_reference = structure.swingLow ?? (currentPrice * 0.97);
    } else if (distSup !== null && distSup < 0.005) {
      evaluation.direction = "SELL";
      evaluation.confidence = parseFloat(Math.min(0.95, 0.6 + (volume.relativeVolume - 1.5) * 0.1).toFixed(2));
      evaluation.reason = `Bearish Breakdown confirmed by relative volume (${volume.relativeVolume.toFixed(2)}x) near Support`;
      evaluation.entry_reference = structure.swingLow ?? currentPrice;
      evaluation.invalidation_reference = structure.swingHigh ?? (currentPrice * 1.03);
    }

    return evaluation;
  }
}

// =========================================================================
// 4. MEAN REVERSION STRATEGY
// =========================================================================
export class MeanReversionStrategy implements BaseStrategy {
  strategy_name = "RSI + Bollinger Mean Reversion";
  strategy_version = "1.0.0";

  evaluate(features: FeatureSet, regime: MarketRegimeType): StrategyEvaluation {
    const { momentum, volatility, structure } = features;
    const currentPrice = features.volatility.bbMiddle ?? 100;

    const evaluation: StrategyEvaluation = {
      direction: "HOLD",
      confidence: 0.0,
      reason: "No extreme mean reversion triggers identified.",
      entry_reference: null,
      invalidation_reference: null,
      strategy_name: this.strategy_name,
      strategy_version: this.strategy_version
    };

    // Mean reversion operates best in non-trending markets
    if (regime === "TRENDING_BULLISH" || regime === "TRENDING_BEARISH" || regime === "HIGH_VOLATILITY") {
      evaluation.reason = `Mean reversion inactive in highly trending/volatile regime: ${regime}`;
      return evaluation;
    }

    if (momentum.rsi === null || volatility.bbLower === null || volatility.bbUpper === null) {
      evaluation.reason = "Insufficient features for mean reversion bands.";
      return evaluation;
    }

    // Reversal Buy: RSI is oversold (< 30) AND price is sitting near/below lower Bollinger Band
    if (momentum.rsi < 30 && structure.distanceToSupport !== null && structure.distanceToSupport < 0.01) {
      evaluation.direction = "BUY";
      evaluation.confidence = parseFloat(Math.min(0.9, 0.5 + (30 - momentum.rsi) * 0.015).toFixed(2));
      evaluation.reason = `Extreme oversold conditions (RSI: ${momentum.rsi.toFixed(1)}) near Lower Bollinger Band`;
      evaluation.entry_reference = volatility.bbLower;
      evaluation.invalidation_reference = structure.swingLow ?? (volatility.bbLower * 0.985);
    }
    // Reversal Sell: RSI is overbought (> 70) AND price is sitting near/above upper Bollinger Band
    else if (momentum.rsi > 70 && structure.distanceToResistance !== null && structure.distanceToResistance < 0.01) {
      evaluation.direction = "SELL";
      evaluation.confidence = parseFloat(Math.min(0.9, 0.5 + (momentum.rsi - 70) * 0.015).toFixed(2));
      evaluation.reason = `Extreme overbought conditions (RSI: ${momentum.rsi.toFixed(1)}) near Upper Bollinger Band`;
      evaluation.entry_reference = volatility.bbUpper;
      evaluation.invalidation_reference = structure.swingHigh ?? (volatility.bbUpper * 1.015);
    }

    return evaluation;
  }
}

// =========================================================================
// 5. ORDER FLOW STRATEGY
// =========================================================================
export class OrderFlowStrategy implements BaseStrategy {
  strategy_name = "Order Flow Imbalance Analyzer";
  strategy_version = "1.0.0";

  evaluate(features: FeatureSet, _regime: MarketRegimeType): StrategyEvaluation {
    const { volume, structure } = features;
    const currentPrice = features.volatility.bbMiddle ?? 100;

    const evaluation: StrategyEvaluation = {
      direction: "HOLD",
      confidence: 0.0,
      reason: "No volume imbalance or high-conviction order flow identified.",
      entry_reference: null,
      invalidation_reference: null,
      strategy_name: this.strategy_name,
      strategy_version: this.strategy_version
    };

    if (volume.relativeVolume === null || volume.volumeChange === null) {
      evaluation.reason = "Insufficient volume metrics to run order flow.";
      return evaluation;
    }

    // High volume with clear candle shape bias (rejections or body sizing)
    if (volume.relativeVolume > 1.5) {
      const isBullishWick = structure.lowerWick > structure.upperWick * 2.0;
      const isBearishWick = structure.upperWick > structure.lowerWick * 2.0;

      if (isBullishWick && volume.volumeChange > 0.3) {
        evaluation.direction = "BUY";
        evaluation.confidence = parseFloat(Math.min(0.85, 0.6 + (volume.relativeVolume - 1.5) * 0.1).toFixed(2));
        evaluation.reason = `Order flow buys: volume accelerating with massive lower wick rejection (wick: ${structure.lowerWick.toFixed(2)})`;
        evaluation.entry_reference = currentPrice;
        evaluation.invalidation_reference = currentPrice - structure.lowerWick;
      } else if (isBearishWick && volume.volumeChange > 0.3) {
        evaluation.direction = "SELL";
        evaluation.confidence = parseFloat(Math.min(0.85, 0.6 + (volume.relativeVolume - 1.5) * 0.1).toFixed(2));
        evaluation.reason = `Order flow sells: volume accelerating with massive upper wick rejection (wick: ${structure.upperWick.toFixed(2)})`;
        evaluation.entry_reference = currentPrice;
        evaluation.invalidation_reference = currentPrice + structure.upperWick;
      }
    }

    return evaluation;
  }
}

// =========================================================================
// 6. VOLATILITY FILTER STRATEGY
// =========================================================================
export class VolatilityFilterStrategy implements BaseStrategy {
  strategy_name = "Volatility Filter & Breakdown Protection";
  strategy_version = "1.0.0";

  evaluate(features: FeatureSet, regime: MarketRegimeType): StrategyEvaluation {
    const { volatility, trend } = features;
    const currentPrice = features.volatility.bbMiddle ?? 100;

    // By default, this is a protector module. If volatility is dangerously low, it blocks trading (or returns HOLD).
    // If volatility is healthy and aligned, it can confirm trades.
    if (volatility.bbWidth !== null && volatility.bbWidth < 0.012) {
      return {
        direction: "HOLD",
        confidence: 0.95,
        reason: `BLOCKED: Market is flat, standard BB Width is extremely compressed (${(volatility.bbWidth * 100).toFixed(2)}%). High risk of random walk/slippage.`,
        entry_reference: null,
        invalidation_reference: null,
        strategy_name: this.strategy_name,
        strategy_version: this.strategy_version
      };
    }

    // High volatility rider: if regime is high volatility and we have a strong directional trend, we can trade the expansion
    if (regime === "HIGH_VOLATILITY") {
      if (trend.isBullishEMAStack || (trend.ema20_slope !== null && trend.ema20_slope > 0.002)) {
        return {
          direction: "BUY",
          confidence: 0.8,
          reason: `High Volatility expansion detected (BB Width: ${(volatility.bbWidth ?? 0 * 100).toFixed(1)}%) aligned with Bullish trend.`,
          entry_reference: currentPrice,
          invalidation_reference: currentPrice - (volatility.atr ?? 10),
          strategy_name: this.strategy_name,
          strategy_version: this.strategy_version
        };
      } else if (trend.ema20_slope !== null && trend.ema20_slope < -0.002) {
        return {
          direction: "SELL",
          confidence: 0.8,
          reason: `High Volatility expansion detected (BB Width: ${(volatility.bbWidth ?? 0 * 100).toFixed(1)}%) aligned with Bearish trend.`,
          entry_reference: currentPrice,
          invalidation_reference: currentPrice + (volatility.atr ?? 10),
          strategy_name: this.strategy_name,
          strategy_version: this.strategy_version
        };
      }
    }

    return {
      direction: "HOLD",
      confidence: 0.0,
      reason: "Volatility is healthy, no protective locks or volatility expansion rides triggered.",
      entry_reference: null,
      invalidation_reference: null,
      strategy_name: this.strategy_name,
      strategy_version: this.strategy_version
    };
  }
}
