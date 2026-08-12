import { MarketRegimeClassifier, MarketRegimeType } from "./src/utils/regimeClassifier";
import { FeatureSet } from "./src/utils/featureEngine";

// =========================================================================
// MOCK FEATURE SET GENERATOR
// Helper to construct clear FeatureSet structures to isolate target behaviors
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

  // Perform a deep merge-ish operation for mock data
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
// RUN REGIME ENGINE TEST SUITE
// =========================================================================

async function runRegimeTests() {
  console.log("============================================================");
  console.log("       STARTING CENTRALIZED MARKET REGIME TESTS              ");
  console.log("============================================================\n");

  let passedCount = 0;
  let totalCount = 0;

  const assertRegime = (name: string, features: FeatureSet, expected: MarketRegimeType) => {
    totalCount++;
    try {
      const result = MarketRegimeClassifier.classify(features);
      const isPass = result.regime === expected;
      
      console.log(`[TEST] ${name}`);
      console.log(`   Expected:   ${expected}`);
      console.log(`   Classified: ${result.regime}`);
      console.log(`   Confidence: ${result.confidence}`);
      console.log(`   Reasons:    ${result.reasons.join(" | ")}`);
      console.log(`   Features:   ${result.features_used.join(", ")}`);

      if (isPass) {
        console.log(`   RESULT:     ✅ PASS\n`);
        passedCount++;
        return true;
      } else {
        console.log(`   RESULT:     ❌ FAIL\n`);
        return false;
      }
    } catch (e: any) {
      console.log(`[TEST] ${name} -> CRASHED with error: ${e.message}\n`);
      return false;
    }
  };

  // 1. Test TRENDING_BULLISH
  const bullishFeatures = createMockFeatureSet({
    trend: {
      ema20: 105,
      ema50: 103,
      ema100: 101,
      ema200: 98,
      ema20_slope: 0.003,
      ema50_slope: 0.002,
      adx: 32,
      plusDI: 28,
      minusDI: 14,
      isBullishEMAStack: true
    },
    momentum: {
      rsi: 72,
      macdLine: 1.5,
      signalLine: 1.0,
      macdHistogram: 0.5,
      roc: 5.4
    },
    multiTimeframe: {
      higherTimeframeTrend: "bullish",
      primaryTimeframeTrend: "bullish",
      confirmationTimeframeTrend: "bullish"
    }
  });
  assertRegime("Strong Trending Bullish State", bullishFeatures, "TRENDING_BULLISH");

  // 2. Test TRENDING_BEARISH
  const bearishFeatures = createMockFeatureSet({
    trend: {
      ema20: 94,
      ema50: 96,
      ema100: 98,
      ema200: 102,
      ema20_slope: -0.004,
      ema50_slope: -0.002,
      adx: 35,
      plusDI: 12,
      minusDI: 29,
      isBullishEMAStack: false
    },
    momentum: {
      rsi: 25,
      macdLine: -2.0,
      signalLine: -1.5,
      macdHistogram: -0.5,
      roc: -6.2
    },
    multiTimeframe: {
      higherTimeframeTrend: "bearish",
      primaryTimeframeTrend: "bearish",
      confirmationTimeframeTrend: "bearish"
    }
  });
  assertRegime("Strong Trending Bearish State", bearishFeatures, "TRENDING_BEARISH");

  // 3. Test RANGING
  const rangingFeatures = createMockFeatureSet({
    trend: {
      ema20: 100.1,
      ema50: 100.0,
      ema100: 99.9,
      ema200: 100.0,
      ema20_slope: 0.0001,
      ema50_slope: -0.0001,
      adx: 12,
      plusDI: 16,
      minusDI: 17,
      isBullishEMAStack: false
    },
    momentum: {
      rsi: 48,
      macdLine: 0.02,
      signalLine: 0.01,
      macdHistogram: 0.01,
      roc: 0.1
    },
    volatility: {
      atr: 0.8,
      atrPercent: 0.8,
      bbWidth: 0.018, // 1.8% narrow stable width
      bbUpper: 100.9,
      bbLower: 99.1,
      bbMiddle: 100.0,
      historicalVolatility: 0.004
    }
  });
  assertRegime("Neutral Ranging Consolidation State", rangingFeatures, "RANGING");

  // 4. Test BREAKOUT
  const breakoutFeatures = createMockFeatureSet({
    structure: {
      candleBody: 1.2,
      upperWick: 0.1,
      lowerWick: 0.1,
      range: 1.4,
      swingHigh: 100.0,
      swingLow: 95.0,
      distanceToSupport: 0.05,
      distanceToResistance: 0.0005 // price has closed virtually on/above resistance level
    },
    volume: {
      volumeChange: 1.5,
      relativeVolume: 2.4, // high breakout volume
      volumeAcceleration: 0.8
    }
  });
  assertRegime("High-Volume Bullish Resistance Breakout State", breakoutFeatures, "BREAKOUT");

  // 5. Test HIGH_VOLATILITY (Extreme Volatility)
  const highVolFeatures = createMockFeatureSet({
    volatility: {
      atr: 4.5,
      atrPercent: 4.5,
      bbWidth: 0.12, // extremely wide 12% width
      bbUpper: 106,
      bbLower: 94,
      bbMiddle: 100,
      historicalVolatility: 0.065 // massive HV standard dev
    }
  });
  assertRegime("Extreme High Volatility State", highVolFeatures, "HIGH_VOLATILITY");

  // 6. Test LOW_VOLATILITY
  const lowVolFeatures = createMockFeatureSet({
    volatility: {
      atr: 0.2,
      atrPercent: 0.2,
      bbWidth: 0.008, // extremely tight sub-1% width
      bbUpper: 100.4,
      bbLower: 99.6,
      bbMiddle: 100,
      historicalVolatility: 0.002
    }
  });
  assertRegime("Tight Low Volatility State", lowVolFeatures, "LOW_VOLATILITY");

  // 7. Test UNCERTAIN (Insufficient Data)
  const insufficientFeatures = createMockFeatureSet({
    metadata: {
      symbol: "ETHUSDT",
      primaryTimeframe: "15m",
      calculatedAt: Date.now(),
      candleCount: 5, // insufficient history
      isFallback: true
    }
  });
  assertRegime("Insufficient Data Fallback State", insufficientFeatures, "UNCERTAIN");

  // 8. Test UNCERTAIN (Conflicting Indicators)
  const conflictingFeatures = createMockFeatureSet({
    trend: {
      ema20: 105,
      ema50: 103,
      ema100: 101,
      ema200: 98,
      isBullishEMAStack: true // Bullish Trend Stack
    },
    momentum: {
      rsi: 15 // Strongly Oversold / Crashing momentum! (Direct Conflict)
    },
    multiTimeframe: {
      higherTimeframeTrend: "bullish",
      primaryTimeframeTrend: "bearish", // Disaligned multi-timeframe
      confirmationTimeframeTrend: "bullish"
    }
  });
  assertRegime("Highly Conflicting Technical Indicators State", conflictingFeatures, "UNCERTAIN");

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log("============================================================");
  console.log(`      VERIFICATION SUMMARY: ${passedCount}/${totalCount} TESTS PASSED.`);
  if (passedCount === totalCount) {
    console.log("🎉 ALL MARKET REGIME TESTS COMPLETED AND VERIFIED SUCCESSFULLY!");
  } else {
    console.log("❌ SOME REGIME TESTS FAILED. CHECK CLASSIFICATION BIASES.");
    process.exit(1);
  }
  console.log("============================================================");
}

runRegimeTests();
