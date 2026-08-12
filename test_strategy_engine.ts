import { FeatureSet } from "./src/utils/featureEngine.js";
import { MarketRegimeType } from "./src/utils/regimeClassifier.js";
import {
  TrendFollowingStrategy,
  MomentumStrategy,
  BreakoutStrategy,
  MeanReversionStrategy,
  OrderFlowStrategy,
  VolatilityFilterStrategy,
  StrategyEvaluation
} from "./src/utils/strategyEngine.js";

// =========================================================================
// DEEP PARTIAL FEATURE SET MOCK HELPER
// =========================================================================
interface DeepPartialFeatureSet {
  metadata?: Partial<FeatureSet["metadata"]>;
  trend?: Partial<FeatureSet["trend"]>;
  momentum?: Partial<FeatureSet["momentum"]>;
  volatility?: Partial<FeatureSet["volatility"]>;
  structure?: Partial<FeatureSet["structure"]>;
  volume?: Partial<FeatureSet["volume"]>;
  multiTimeframe?: Partial<FeatureSet["multiTimeframe"]>;
}

function createMockFeatureSet(custom: DeepPartialFeatureSet): FeatureSet {
  const base: FeatureSet = {
    metadata: {
      symbol: "BTCUSDT",
      primaryTimeframe: "15m",
      calculatedAt: Date.now(),
      candleCount: 100,
      isFallback: false
    },
    trend: {
      ema20: 100,
      ema50: 98,
      ema100: 95,
      ema200: 90,
      ema20_slope: 0.002,
      ema50_slope: 0.001,
      adx: 15,
      plusDI: 15,
      minusDI: 15,
      isBullishEMAStack: false
    },
    momentum: {
      rsi: 50,
      macdLine: 0,
      signalLine: 0,
      macdHistogram: 0,
      roc: 0
    },
    volatility: {
      atr: 1.5,
      atrPercent: 1.5,
      bbWidth: 0.03, // stable standard BB width (3%)
      bbUpper: 101.5,
      bbLower: 98.5,
      bbMiddle: 100,
      historicalVolatility: 0.015
    },
    structure: {
      candleBody: 0.5,
      upperWick: 0.1,
      lowerWick: 0.1,
      range: 0.7,
      swingHigh: 102.5,
      swingLow: 97.5,
      distanceToSupport: 0.025,
      distanceToResistance: 0.025
    },
    volume: {
      volumeChange: 0,
      relativeVolume: 1.0,
      volumeAcceleration: 0
    },
    multiTimeframe: {
      higherTimeframeTrend: "neutral",
      primaryTimeframeTrend: "neutral",
      confirmationTimeframeTrend: "neutral"
    }
  };

  return {
    metadata: { ...base.metadata, ...custom.metadata },
    trend: { ...base.trend, ...custom.trend } as any,
    momentum: { ...base.momentum, ...custom.momentum } as any,
    volatility: { ...base.volatility, ...custom.volatility } as any,
    structure: { ...base.structure, ...custom.structure } as any,
    volume: { ...base.volume, ...custom.volume } as any,
    multiTimeframe: { ...base.multiTimeframe, ...custom.multiTimeframe } as any
  };
}

// =========================================================================
// CENTRAL TEST RUNNER FOR STRATEGIES
// =========================================================================

async function runStrategyTests() {
  console.log("============================================================");
  console.log("       STARTING STRATEGY ENGINE VALIDATION TESTS             ");
  console.log("============================================================\n");

  let totalCount = 0;
  let passedCount = 0;

  const assertEvaluation = (
    testName: string,
    evaluation: StrategyEvaluation,
    expectedDirection: "BUY" | "SELL" | "HOLD",
    minConfidence: number = 0.0
  ) => {
    totalCount++;
    const isDirectionPass = evaluation.direction === expectedDirection;
    const isConfidencePass = evaluation.confidence >= minConfidence;
    const isFormatPass =
      evaluation.strategy_name !== "" &&
      evaluation.strategy_version !== "" &&
      typeof evaluation.reason === "string";

    console.log(`[TEST] ${testName}`);
    console.log(`   Strategy:   ${evaluation.strategy_name} (v${evaluation.strategy_version})`);
    console.log(`   Direction:  ${evaluation.direction} (Expected: ${expectedDirection})`);
    console.log(`   Confidence: ${evaluation.confidence} (Min target: ${minConfidence})`);
    console.log(`   Reasoning:  ${evaluation.reason}`);
    console.log(`   References: Entry=$${evaluation.entry_reference} | Invalidation=$${evaluation.invalidation_reference}`);

    if (isDirectionPass && isConfidencePass && isFormatPass) {
      console.log(`   RESULT:     ✅ PASS\n`);
      passedCount++;
      return true;
    } else {
      console.log(`   RESULT:     ❌ FAIL`);
      if (!isDirectionPass) console.log(`      -> Failed Direction Match`);
      if (!isConfidencePass) console.log(`      -> Failed Min Confidence (${evaluation.confidence} < ${minConfidence})`);
      if (!isFormatPass) console.log(`      -> Failed Format Requirement (missing metadata)`);
      console.log("\n");
      return false;
    }
  };

  // -------------------------------------------------------------------------
  // 1. TREND FOLLOWING STRATEGY TESTS
  // -------------------------------------------------------------------------
  const trendStrategy = new TrendFollowingStrategy();

  // Valid setup
  const validTrendFeatures = createMockFeatureSet({
    trend: {
      isBullishEMAStack: true,
      ema20_slope: 0.003
    },
    multiTimeframe: {
      higherTimeframeTrend: "bullish"
    }
  });
  const trendValidEval = trendStrategy.evaluate(validTrendFeatures, "TRENDING_BULLISH");
  assertEvaluation("TrendFollowing: Valid Bullish Setup", trendValidEval, "BUY", 0.7);

  // Invalid setup (Ranging regime suppresses execution)
  const invalidTrendFeatures = createMockFeatureSet({
    trend: {
      isBullishEMAStack: true
    }
  });
  const trendInvalidEval = trendStrategy.evaluate(invalidTrendFeatures, "RANGING");
  assertEvaluation("TrendFollowing: Inactive Ranging Suppression", trendInvalidEval, "HOLD", 0.0);

  // -------------------------------------------------------------------------
  // 2. MOMENTUM STRATEGY TESTS
  // -------------------------------------------------------------------------
  const momentumStrategy = new MomentumStrategy();

  // Valid setup
  const validMomFeatures = createMockFeatureSet({
    momentum: {
      rsi: 62.5,
      macdHistogram: 1.2,
      roc: 2.1
    }
  });
  const momValidEval = momentumStrategy.evaluate(validMomFeatures, "RANGING");
  assertEvaluation("Momentum: Valid Accelerating Bullish Setup", momValidEval, "BUY", 0.75);

  // Invalid setup (Insufficient features)
  const invalidMomFeatures = createMockFeatureSet({
    momentum: {
      rsi: null as any,
      macdHistogram: null as any
    }
  });
  const momInvalidEval = momentumStrategy.evaluate(invalidMomFeatures, "RANGING");
  assertEvaluation("Momentum: Graceful Handling of Null Features", momInvalidEval, "HOLD", 0.0);

  // -------------------------------------------------------------------------
  // 3. BREAKOUT STRATEGY TESTS
  // -------------------------------------------------------------------------
  const breakoutStrategy = new BreakoutStrategy();

  // Valid setup
  const validBreakoutFeatures = createMockFeatureSet({
    structure: {
      distanceToResistance: 0.002,
      swingHigh: 105.0,
      swingLow: 98.0
    },
    volume: {
      relativeVolume: 2.2
    }
  });
  const breakoutValidEval = breakoutStrategy.evaluate(validBreakoutFeatures, "BREAKOUT");
  assertEvaluation("Breakout: Valid Resistance Piercing Setup", breakoutValidEval, "BUY", 0.6);

  // Invalid setup (Low volume invalidates breakout trigger)
  const invalidBreakoutFeatures = createMockFeatureSet({
    structure: {
      distanceToResistance: 0.002
    },
    volume: {
      relativeVolume: 0.8 // too low
    }
  });
  const breakoutInvalidEval = breakoutStrategy.evaluate(invalidBreakoutFeatures, "BREAKOUT");
  assertEvaluation("Breakout: Low Volume Invalidation Filter", breakoutInvalidEval, "HOLD", 0.0);

  // -------------------------------------------------------------------------
  // 4. MEAN REVERSION STRATEGY TESTS
  // -------------------------------------------------------------------------
  const meanReversionStrategy = new MeanReversionStrategy();

  // Valid setup
  const validMREvalFeatures = createMockFeatureSet({
    momentum: {
      rsi: 21.0
    },
    volatility: {
      bbLower: 98.0,
      bbUpper: 102.0
    },
    structure: {
      distanceToSupport: 0.005,
      swingLow: 97.5
    }
  });
  const mrValidEval = meanReversionStrategy.evaluate(validMREvalFeatures, "RANGING");
  assertEvaluation("MeanReversion: Valid Extremes Oversold Buy Setup", mrValidEval, "BUY", 0.6);

  // Invalid setup (Mean reversion suppressed in strong trending markets)
  const mrInvalidEval = meanReversionStrategy.evaluate(validMREvalFeatures, "TRENDING_BULLISH");
  assertEvaluation("MeanReversion: Suppression in Strong Trend Regime", mrInvalidEval, "HOLD", 0.0);

  // -------------------------------------------------------------------------
  // 5. ORDER FLOW STRATEGY TESTS
  // -------------------------------------------------------------------------
  const orderFlowStrategy = new OrderFlowStrategy();

  // Valid setup
  const validOFFeatures = createMockFeatureSet({
    volume: {
      relativeVolume: 2.4,
      volumeChange: 0.45
    },
    structure: {
      lowerWick: 1.5,
      upperWick: 0.2
    }
  });
  const ofValidEval = orderFlowStrategy.evaluate(validOFFeatures, "RANGING");
  assertEvaluation("OrderFlow: High-Volume Rejection Wick Buy Setup", ofValidEval, "BUY", 0.65);

  // Invalid setup (Low volume suppresses order flow edge)
  const invalidOFFeatures = createMockFeatureSet({
    volume: {
      relativeVolume: 1.1,
      volumeChange: 0.1
    },
    structure: {
      lowerWick: 1.5,
      upperWick: 0.2
    }
  });
  const ofInvalidEval = orderFlowStrategy.evaluate(invalidOFFeatures, "RANGING");
  assertEvaluation("OrderFlow: Low-Volume Rejection Suppression", ofInvalidEval, "HOLD", 0.0);

  // -------------------------------------------------------------------------
  // 6. VOLATILITY FILTER TESTS
  // -------------------------------------------------------------------------
  const volatilityStrategy = new VolatilityFilterStrategy();

  // Valid setup (Protection lock triggered by extremely flat market)
  const validVolLockFeatures = createMockFeatureSet({
    volatility: {
      bbWidth: 0.008 // sub-1% width
    }
  });
  const volLockEval = volatilityStrategy.evaluate(validVolLockFeatures, "RANGING");
  assertEvaluation("VolatilityFilter: Dry Low-Volatility BLOCKING Setup", volLockEval, "HOLD", 0.9);

  // Invalid setup (No blocking rules triggered with healthy volatility)
  const validHealthyVolFeatures = createMockFeatureSet({
    volatility: {
      bbWidth: 0.035
    }
  });
  const volHealthyEval = volatilityStrategy.evaluate(validHealthyVolFeatures, "RANGING");
  assertEvaluation("VolatilityFilter: Inactive on Healthy Market Sizing", volHealthyEval, "HOLD", 0.0);

  // =========================================================================
  // OVERALL STATUS
  // =========================================================================
  console.log("============================================================");
  console.log(`      VERIFICATION SUMMARY: ${passedCount}/${totalCount} TESTS PASSED.`);
  if (passedCount === totalCount) {
    console.log("🎉 ALL STRATEGY ENGINE TESTS COMPLETED AND VERIFIED SUCCESSFULLY!");
  } else {
    console.log("❌ SOME STRATEGY TESTS FAILED. CHECK STRATEGY BOUNDARIES.");
    process.exit(1);
  }
  console.log("============================================================");
}

runStrategyTests();
