import { StrategyEnsemble, StrategyEnsembleReport } from "./src/utils/strategyEnsemble.js";
import { FeatureSet } from "./src/utils/featureEngine.js";
import { MarketRegimeType } from "./src/utils/regimeClassifier.js";
import { BaseStrategy, StrategyEvaluation } from "./src/utils/strategyEngine.js";

// =========================================================================
// MOCK FEATURE SET GENERATOR
// =========================================================================
function createDefaultMockFeatureSet(): FeatureSet {
  return {
    metadata: {
      symbol: "BTCUSDT",
      primaryTimeframe: "15m",
      calculatedAt: Date.now(),
      candleCount: 100,
      isFallback: false
    },
    trend: {
      ema20: 100, ema50: 98, ema100: 95, ema200: 90,
      ema20_slope: 0.002, ema50_slope: 0.001,
      adx: 15, plusDI: 15, minusDI: 15,
      isBullishEMAStack: false
    },
    momentum: { rsi: 50, macdLine: 0, signalLine: 0, macdHistogram: 0, roc: 0 },
    volatility: {
      atr: 1.5, atrPercent: 1.5, bbWidth: 0.03,
      bbUpper: 101.5, bbLower: 98.5, bbMiddle: 100,
      historicalVolatility: 0.015
    },
    structure: {
      candleBody: 0.5, upperWick: 0.1, lowerWick: 0.1, range: 0.7,
      swingHigh: 102.5, swingLow: 97.5,
      distanceToSupport: 0.025, distanceToResistance: 0.025
    },
    volume: { volumeChange: 0, relativeVolume: 1.0, volumeAcceleration: 0 },
    multiTimeframe: {
      higherTimeframeTrend: "neutral",
      primaryTimeframeTrend: "neutral",
      confirmationTimeframeTrend: "neutral"
    }
  };
}

// =========================================================================
// TEST DOUBLES FOR RELIABLE ENSEMBLE SCENARIOS
// =========================================================================
class MockFixedStrategy implements BaseStrategy {
  constructor(
    public strategy_name: string,
    public directionToReturn: "BUY" | "SELL" | "HOLD"
  ) {}
  strategy_version = "1.0.0";

  evaluate(_features: FeatureSet, _regime: MarketRegimeType): StrategyEvaluation {
    return {
      direction: this.directionToReturn,
      confidence: 0.85,
      reason: `Mocked fixed direction: ${this.directionToReturn}`,
      entry_reference: 100,
      invalidation_reference: 95,
      strategy_name: this.strategy_name,
      strategy_version: this.strategy_version
    };
  }
}

class TestableStrategyEnsemble extends StrategyEnsemble {
  // Expose strategy replacement for isolated deterministic testing
  public setMockStrategies(mocks: BaseStrategy[]) {
    (this as any).strategies = mocks;
  }
}

// =========================================================================
// EXECUTE SUITE
// =========================================================================
async function runEnsembleTests() {
  console.log("============================================================");
  console.log("       STARTING STRATEGY ENSEMBLE LAYER TESTS               ");
  console.log("============================================================\n");

  let totalCount = 0;
  let passedCount = 0;

  const assertEnsemble = (
    name: string,
    report: StrategyEnsembleReport,
    expectedDirection: "BUY" | "SELL" | "HOLD",
    expectedAgreement: string,
    expectedBullish: number,
    expectedBearish: number,
    expectedNeutral: number
  ) => {
    totalCount++;
    const isDirectionPass = report.dominant_direction === expectedDirection;
    const isAgreementPass = report.strategy_agreement === expectedAgreement;
    const isBullishPass = report.bullish_count === expectedBullish;
    const isBearishPass = report.bearish_count === expectedBearish;
    const isNeutralPass = report.neutral_count === expectedNeutral;

    console.log(`[TEST] ${name}`);
    console.log(`   Dominant Bias: ${report.dominant_direction} (Expected: ${expectedDirection})`);
    console.log(`   Agreement:     ${report.strategy_agreement} (Expected: ${expectedAgreement})`);
    console.log(`   Counts:        BUY=${report.bullish_count} | SELL=${report.bearish_count} | HOLD=${report.neutral_count}`);

    if (isDirectionPass && isAgreementPass && isBullishPass && isBearishPass && isNeutralPass) {
      console.log("   RESULT:        ✅ PASS\n");
      passedCount++;
      return true;
    } else {
      console.log("   RESULT:        ❌ FAIL");
      if (!isDirectionPass) console.log(`      -> Failed Dominant Direction Match`);
      if (!isAgreementPass) console.log(`      -> Failed Agreement String Match`);
      if (!isBullishPass) console.log(`      -> Failed Bullish Count`);
      if (!isBearishPass) console.log(`      -> Failed Bearish Count`);
      if (!isNeutralPass) console.log(`      -> Failed Neutral Count`);
      console.log("\n");
      return false;
    }
  };

  const ensemble = new TestableStrategyEnsemble();
  const dummyFeatures = createDefaultMockFeatureSet();

  // Scenario 1: All Bullish
  ensemble.setMockStrategies([
    new MockFixedStrategy("S1", "BUY"),
    new MockFixedStrategy("S2", "BUY"),
    new MockFixedStrategy("S3", "BUY"),
    new MockFixedStrategy("S4", "BUY"),
    new MockFixedStrategy("S5", "BUY")
  ]);
  const r1 = ensemble.evaluateEnsemble(dummyFeatures, "TRENDING_BULLISH");
  assertEnsemble("Case 1: All Bullish Consensus", r1, "BUY", "5/5", 5, 0, 0);

  // Scenario 2: All Bearish
  ensemble.setMockStrategies([
    new MockFixedStrategy("S1", "SELL"),
    new MockFixedStrategy("S2", "SELL"),
    new MockFixedStrategy("S3", "SELL"),
    new MockFixedStrategy("S4", "SELL")
  ]);
  const r2 = ensemble.evaluateEnsemble(dummyFeatures, "TRENDING_BEARISH");
  assertEnsemble("Case 2: All Bearish Consensus", r2, "SELL", "4/4", 0, 4, 0);

  // Scenario 3: Conflicting Strategies (e.g. 2 BUY, 2 SELL, 1 HOLD)
  ensemble.setMockStrategies([
    new MockFixedStrategy("S1", "BUY"),
    new MockFixedStrategy("S2", "BUY"),
    new MockFixedStrategy("S3", "SELL"),
    new MockFixedStrategy("S4", "SELL"),
    new MockFixedStrategy("S5", "HOLD")
  ]);
  const r3 = ensemble.evaluateEnsemble(dummyFeatures, "RANGING");
  // Dominant is HOLD due to tie-breaking neutrality rule
  assertEnsemble("Case 3: Conflicting Bias (Tied Buy vs Sell)", r3, "HOLD", "1/5", 2, 2, 1);

  // Scenario 4: No Strategy Evaluated
  ensemble.setMockStrategies([]);
  const r4 = ensemble.evaluateEnsemble(dummyFeatures, "RANGING");
  assertEnsemble("Case 4: No Strategy Registered", r4, "HOLD", "0/0", 0, 0, 0);

  // Scenario 5: Insufficient Data (All strategies default to HOLD/suppression)
  const fallbackFeatures = createDefaultMockFeatureSet();
  fallbackFeatures.metadata.isFallback = true;
  fallbackFeatures.metadata.candleCount = 5; // Insufficient history

  // Restore the real active strategies
  const liveEnsemble = new StrategyEnsemble();
  const r5 = liveEnsemble.evaluateEnsemble(fallbackFeatures, "UNCERTAIN");
  
  // All 6 strategy engines should gracefully degrade to HOLD when regime is UNCERTAIN or history is insufficient
  assertEnsemble("Case 5: Insufficient Data Suppressions (Fallback)", r5, "HOLD", "6/6", 0, 0, 6);

  // =========================================================================
  // OVERALL STATUS SUMMARY
  // =========================================================================
  console.log("============================================================");
  console.log(`      VERIFICATION SUMMARY: ${passedCount}/${totalCount} TESTS PASSED.`);
  if (passedCount === totalCount) {
    console.log("🎉 ALL STRATEGY ENSEMBLE TESTS COMPLETED SUCCESSFULLY!");
  } else {
    console.log("❌ SOME ENSEMBLE LAYER TESTS FAILED. CHECK INTEGRATIONS.");
    process.exit(1);
  }
  console.log("============================================================");
}

runEnsembleTests();
