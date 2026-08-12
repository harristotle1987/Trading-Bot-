import { FeatureSet } from "./featureEngine.js";
import { MarketRegimeType } from "./regimeClassifier.js";
import {
  BaseStrategy,
  StrategyEvaluation,
  TrendFollowingStrategy,
  MomentumStrategy,
  BreakoutStrategy,
  MeanReversionStrategy,
  OrderFlowStrategy,
  VolatilityFilterStrategy,
  StrategyDirection
} from "./strategyEngine.js";

export interface StrategyEnsembleReport {
  strategy_results: StrategyEvaluation[];
  dominant_direction: StrategyDirection;
  strategy_agreement: string; // e.g., "4/6"
  agreement_ratio: number;     // e.g., 0.67
  bullish_count: number;
  bearish_count: number;
  neutral_count: number;
}

export class StrategyEnsemble {
  private strategies: BaseStrategy[] = [];

  constructor() {
    this.strategies = [
      new TrendFollowingStrategy(),
      new MomentumStrategy(),
      new BreakoutStrategy(),
      new MeanReversionStrategy(),
      new OrderFlowStrategy(),
      new VolatilityFilterStrategy()
    ];
  }

  /**
   * Evaluates all registered strategies and aggregates their directions.
   */
  evaluateEnsemble(features: FeatureSet, regime: MarketRegimeType): StrategyEnsembleReport {
    const results: StrategyEvaluation[] = [];

    // Run all registered strategies
    for (const strategy of this.strategies) {
      try {
        const evalResult = strategy.evaluate(features, regime);
        results.push(evalResult);
      } catch (e: any) {
        // Safe fallback in case of execution failure
        results.push({
          direction: "HOLD",
          confidence: 0.0,
          reason: `Strategy failed execution: ${e.message}`,
          entry_reference: null,
          invalidation_reference: null,
          strategy_name: strategy.strategy_name,
          strategy_version: strategy.strategy_version
        });
      }
    }

    let bullish_count = 0;
    let bearish_count = 0;
    let neutral_count = 0;

    for (const r of results) {
      if (r.direction === "BUY") {
        bullish_count++;
      } else if (r.direction === "SELL") {
        bearish_count++;
      } else {
        neutral_count++;
      }
    }

    // Determine dominant active direction (BUY vs SELL vs HOLD)
    let dominant_direction: StrategyDirection = "HOLD";
    let dominant_count = neutral_count;

    if (bullish_count > bearish_count) {
      dominant_direction = "BUY";
      dominant_count = bullish_count;
    } else if (bearish_count > bullish_count) {
      dominant_direction = "SELL";
      dominant_count = bearish_count;
    } else {
      // Tie-breaker or no active signals -> HOLD
      dominant_direction = "HOLD";
      dominant_count = neutral_count;
    }

    const totalStrategies = this.strategies.length;
    const strategy_agreement = `${dominant_count}/${totalStrategies}`;
    const agreement_ratio = totalStrategies > 0 ? parseFloat((dominant_count / totalStrategies).toFixed(2)) : 0;

    return {
      strategy_results: results,
      dominant_direction,
      strategy_agreement,
      agreement_ratio,
      bullish_count,
      bearish_count,
      neutral_count
    };
  }
}
