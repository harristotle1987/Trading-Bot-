import { FeatureSet } from "./featureEngine.js";

export type MarketRegimeType =
  | "TRENDING_BULLISH"
  | "TRENDING_BEARISH"
  | "RANGING"
  | "BREAKOUT"
  | "HIGH_VOLATILITY"
  | "LOW_VOLATILITY"
  | "UNCERTAIN";

export interface RegimeClassification {
  regime: MarketRegimeType;
  confidence: number; // 0.0 to 1.0
  reasons: string[];
  features_used: string[];
}

export class MarketRegimeClassifier {
  /**
   * Classifies the current market state into a standard regime using deterministic quantitative feature checks.
   */
  static classify(features: FeatureSet): RegimeClassification {
    const reasons: string[] = [];
    const featuresUsed: string[] = [];

    // 1. Boundary condition: Insufficient data or fallback
    if (features.metadata.isFallback || features.metadata.candleCount < 20) {
      featuresUsed.push("metadata.isFallback", "metadata.candleCount");
      return {
        regime: "UNCERTAIN",
        confidence: 1.0,
        reasons: ["Insufficient historical data to determine market regime (requires >= 20 candles)"],
        features_used: featuresUsed
      };
    }

    const { trend, momentum, volatility, structure, volume, multiTimeframe } = features;

    // We track scores for each regime. The highest scoring regime wins.
    let bullishTrendScore = 0;
    let bearishTrendScore = 0;
    let rangingScore = 0;
    let breakoutScore = 0;
    let highVolScore = 0;
    let lowVolScore = 0;
    let conflictScore = 0;

    const bullishReasons: string[] = [];
    const bearishReasons: string[] = [];
    const rangingReasons: string[] = [];
    const breakoutReasons: string[] = [];
    const highVolReasons: string[] = [];
    const lowVolReasons: string[] = [];
    const conflictReasons: string[] = [];

    // Helper to log feature usage
    const useFeature = (...names: string[]) => {
      names.forEach((name) => {
        if (!featuresUsed.includes(name)) featuresUsed.push(name);
      });
    };

    // =========================================================================
    // REGIME CRITERIA CALCULATIONS
    // =========================================================================

    // A. Trend Indicators
    if (trend.adx !== null && trend.adx > 25) {
      useFeature("trend.adx");
      if (trend.plusDI !== null && trend.minusDI !== null) {
        useFeature("trend.plusDI", "trend.minusDI");
        if (trend.plusDI > trend.minusDI + 5) {
          bullishTrendScore += 2;
          bullishReasons.push(`ADX is elevated (${trend.adx.toFixed(1)}) with positive DI dominance`);
        } else if (trend.minusDI > trend.plusDI + 5) {
          bearishTrendScore += 2;
          bearishReasons.push(`ADX is elevated (${trend.adx.toFixed(1)}) with negative DI dominance`);
        }
      }
    }

    if (trend.isBullishEMAStack) {
      useFeature("trend.isBullishEMAStack");
      bullishTrendScore += 3;
      bullishReasons.push("Bullish EMA Stack (20 > 50 > 100 > 200)");
    } else {
      // Check for Bearish EMA Stack
      useFeature("trend.ema20", "trend.ema50", "trend.ema100", "trend.ema200");
      if (
        trend.ema20 !== null &&
        trend.ema50 !== null &&
        trend.ema100 !== null &&
        trend.ema200 !== null &&
        trend.ema20 < trend.ema50 &&
        trend.ema50 < trend.ema100 &&
        trend.ema100 < trend.ema200
      ) {
        bearishTrendScore += 3;
        bearishReasons.push("Bearish EMA Stack (20 < 50 < 100 < 200)");
      }
    }

    if (trend.ema20_slope !== null) {
      useFeature("trend.ema20_slope");
      if (trend.ema20_slope > 0.001) {
        bullishTrendScore += 1;
        bullishReasons.push(`EMA20 slope is positive (${(trend.ema20_slope * 100).toFixed(2)}%)`);
      } else if (trend.ema20_slope < -0.001) {
        bearishTrendScore += 1;
        bearishReasons.push(`EMA20 slope is negative (${(trend.ema20_slope * 100).toFixed(2)}%)`);
      }
    }

    // B. Volatility Indicators
    if (volatility.bbWidth !== null) {
      useFeature("volatility.bbWidth");
      if (volatility.bbWidth > 0.08) {
        highVolScore += 3;
        highVolReasons.push(`Bollinger Band Width is extremely wide (${(volatility.bbWidth * 100).toFixed(1)}%)`);
      } else if (volatility.bbWidth < 0.015) {
        lowVolScore += 3;
        lowVolReasons.push(`Bollinger Band Width is extremely tight (${(volatility.bbWidth * 100).toFixed(1)}%)`);
      } else if (volatility.bbWidth >= 0.015 && volatility.bbWidth <= 0.04 && (trend.adx === null || trend.adx < 20)) {
        rangingScore += 2;
        rangingReasons.push(`Bollinger Band Width is stable/narrow (${(volatility.bbWidth * 100).toFixed(1)}%) with weak ADX`);
      }
    }

    if (volatility.historicalVolatility !== null) {
      useFeature("volatility.historicalVolatility");
      if (volatility.historicalVolatility > 0.04) {
        highVolScore += 2;
        highVolReasons.push(`Historical Volatility is elevated (${(volatility.historicalVolatility * 100).toFixed(1)}%)`);
      } else if (volatility.historicalVolatility < 0.005) {
        lowVolScore += 2;
        lowVolReasons.push(`Historical Volatility is very low (${(volatility.historicalVolatility * 100).toFixed(2)}%)`);
      }
    }

    // C. Momentum Indicators
    if (momentum.rsi !== null) {
      useFeature("momentum.rsi");
      if (momentum.rsi > 70) {
        bullishTrendScore += 1;
        bullishReasons.push(`RSI is in overbought momentum territory (${momentum.rsi.toFixed(1)})`);
      } else if (momentum.rsi < 30) {
        bearishTrendScore += 1;
        bearishReasons.push(`RSI is in oversold momentum territory (${momentum.rsi.toFixed(1)})`);
      } else if (momentum.rsi >= 40 && momentum.rsi <= 60) {
        rangingScore += 2;
        rangingReasons.push(`RSI oscillates in central ranging territory (${momentum.rsi.toFixed(1)})`);
      }
    }

    // D. Price Structure & Breakouts
    if (structure.distanceToResistance !== null && structure.distanceToResistance < 0.002) {
      useFeature("structure.distanceToResistance");
      if (volume.relativeVolume !== null && volume.relativeVolume > 1.8) {
        useFeature("volume.relativeVolume");
        breakoutScore += 6;
        breakoutReasons.push("Price near resistance with highly elevated relative volume");
      }
    }

    if (structure.distanceToSupport !== null && structure.distanceToSupport < 0.002) {
      useFeature("structure.distanceToSupport");
      if (volume.relativeVolume !== null && volume.relativeVolume > 1.8) {
        useFeature("volume.relativeVolume");
        breakoutScore += 6;
        breakoutReasons.push("Price near support with highly elevated relative volume");
      }
    }

    // E. Multi-Timeframe Checks
    useFeature(
      "multiTimeframe.primaryTimeframeTrend",
      "multiTimeframe.higherTimeframeTrend",
      "multiTimeframe.confirmationTimeframeTrend"
    );
    if (
      multiTimeframe.primaryTimeframeTrend === "bullish" &&
      multiTimeframe.higherTimeframeTrend === "bullish"
    ) {
      bullishTrendScore += 2;
      bullishReasons.push("Multi-timeframe trend alignment (Primary & Higher both Bullish)");
    } else if (
      multiTimeframe.primaryTimeframeTrend === "bearish" &&
      multiTimeframe.higherTimeframeTrend === "bearish"
    ) {
      bearishTrendScore += 2;
      bearishReasons.push("Multi-timeframe trend alignment (Primary & Higher both Bearish)");
    }

    // F. Conflict Detection (Divergent/Conflicting indicators -> UNCERTAIN)
    if (trend.isBullishEMAStack && momentum.rsi !== null && momentum.rsi < 35) {
      useFeature("trend.isBullishEMAStack", "momentum.rsi");
      conflictScore += 3;
      conflictReasons.push("EMA stack is bullish but RSI is oversold/collapsing");
    }
    if (
      multiTimeframe.higherTimeframeTrend === "bullish" &&
      multiTimeframe.primaryTimeframeTrend === "bearish" &&
      multiTimeframe.confirmationTimeframeTrend === "bullish"
    ) {
      conflictScore += 2;
      conflictReasons.push("Multi-timeframe trends contradict completely (Higher Bullish, Primary Bearish, Lower Bullish)");
    }

    // =========================================================================
    // WINNING REGIME EVALUATION
    // =========================================================================
    const scores = [
      { type: "TRENDING_BULLISH" as MarketRegimeType, score: bullishTrendScore, reasons: bullishReasons },
      { type: "TRENDING_BEARISH" as MarketRegimeType, score: bearishTrendScore, reasons: bearishReasons },
      { type: "RANGING" as MarketRegimeType, score: rangingScore, reasons: rangingReasons },
      { type: "BREAKOUT" as MarketRegimeType, score: breakoutScore, reasons: breakoutReasons },
      { type: "HIGH_VOLATILITY" as MarketRegimeType, score: highVolScore, reasons: highVolReasons },
      { type: "LOW_VOLATILITY" as MarketRegimeType, score: lowVolScore, reasons: lowVolReasons },
      { type: "UNCERTAIN" as MarketRegimeType, score: conflictScore, reasons: conflictReasons }
    ];

    // Find the maximum scoring regime
    let winner = scores[0];
    for (let i = 1; i < scores.length; i++) {
      if (scores[i].score > winner.score) {
        winner = scores[i];
      }
    }

    // If there is a tie at 0 score, or max score is extremely low, mark as UNCERTAIN
    if (winner.score === 0) {
      return {
        regime: "UNCERTAIN",
        confidence: 0.5,
        reasons: ["No dominant indicators or clear technical signals detected."],
        features_used: featuresUsed
      };
    }

    // Calculate a confidence quotient based on how dominant the winning score was.
    // We normalize confidence to stay between 0.35 and 0.95.
    const totalPositiveScore = scores.reduce((sum, s) => sum + s.score, 0);
    const confidenceRatio = totalPositiveScore > 0 ? winner.score / totalPositiveScore : 0.5;
    const confidence = parseFloat((0.35 + confidenceRatio * 0.6).toFixed(2));

    return {
      regime: winner.type,
      confidence: Math.min(0.95, Math.max(0.35, confidence)),
      reasons: winner.reasons.length > 0 ? winner.reasons : ["Conditions met for this technical regime."],
      features_used: featuresUsed
    };
  }
}
