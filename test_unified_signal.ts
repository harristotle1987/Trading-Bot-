import { SimpleCandle } from "./src/utils/featureEngine.js";
import { RiskGuardConfig } from "./src/utils/riskGuard.js";
import { UnifiedSignalEngine, UnifiedPipelineInputs, SignalPayload } from "./src/utils/unifiedSignalEngine.js";

// =========================================================================
// MOCK DATA GENERATION UTILITIES
// =========================================================================

function createLinearTrendCandles(startPrice: number, slope: number, count = 100): SimpleCandle[] {
  const candles: SimpleCandle[] = [];
  let currentPrice = startPrice;
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const timestamp = now - (count - i) * 60000;
    const change = slope * (1 + (Math.sin(i / 2) * 0.1)); // tiny variance
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) + 0.1;
    const low = Math.min(open, close) - 0.1;
    const volume = 1000 + (i % 5) * 200;

    candles.push({ timestamp, open, high, low, close, volume });
    currentPrice = close;
  }
  return candles;
}

const defaultTestConfig: RiskGuardConfig = {
  minimumSignalScore: 70,
  minimumExpectedValue: 5.0,
  minimumMLProbability: 0.60,
  maximumSpread: 0.005,
  maximumVolatility: 5.0,
  maximumDailySignals: 10,
  maximumConsecutiveLosses: 3,
  dailyDrawdownLimit: 500,
  newsBlackout: true,
  correlationExposure: 0.70,
  staleDataProtection: 5000
};

const defaultBaseInputs: Omit<UnifiedPipelineInputs, "primaryCandles"> = {
  symbol: "BTCUSDT",
  assetClass: "crypto",
  timeframe: "15m",
  riskConfig: defaultTestConfig,
  spread: 0.001,
  dailySignalsCount: 2,
  consecutiveLossesCount: 0,
  currentDailyDrawdown: 50,
  isNewsBlackoutActive: false,
  currentCorrelationExposure: 0.35,
  dataAgeMs: 250,
  stakeOrPositionSize: 100,
  mlProbability: null
};

// =========================================================================
// TEST EXECUTION RUNNER
// =========================================================================

async function runUnifiedSignalTests() {
  console.log("============================================================");
  console.log("         STARTING AUTHORITATIVE UNIFIED SIGNAL ENGINE         ");
  console.log("============================================================\n");

  const engine = new UnifiedSignalEngine();
  let totalCount = 0;
  let passedCount = 0;

  const assertSignalResult = (
    name: string,
    inputs: UnifiedPipelineInputs,
    expectedStatus: "SIGNAL" | "NO_TRADE",
    snippetToCheck?: string
  ) => {
    totalCount++;
    const payload = engine.generateSignal(inputs);
    const isStatusPass = payload.status === expectedStatus;
    
    let isSnippetPass = true;
    if (snippetToCheck) {
      isSnippetPass = payload.reasons.some(r => r.toLowerCase().includes(snippetToCheck.toLowerCase()));
    }

    console.log(`[TEST] ${name}`);
    console.log(`   SignalId:   ${payload.signalId}`);
    console.log(`   Regime:     ${payload.marketRegime}`);
    console.log(`   Agreement:  ${payload.strategyAgreement}`);
    console.log(`   Score:      ${payload.signalScore}/100`);
    console.log(`   EV Estimate:${payload.expectedValue !== null ? "$" + payload.expectedValue : "UNAVAILABLE"}`);
    console.log(`   Direction:  ${payload.direction}`);
    console.log(`   STATUS:     ${payload.status} (Expected: ${expectedStatus})`);
    console.log(`   Reasons:    ${payload.reasons.join(" | ")}`);

    if (isStatusPass && isSnippetPass) {
      console.log("   RESULT:     ✅ PASS\n");
      passedCount++;
      return true;
    } else {
      console.log("   RESULT:     ❌ FAIL");
      if (!isStatusPass) console.log(`      -> Status Mismatch: Got ${payload.status}, Expected ${expectedStatus}`);
      if (!isSnippetPass) console.log(`      -> Expected Snippet "${snippetToCheck}" missing in reasons log`);
      console.log("\n");
      return false;
    }
  };

  // Scenario 1: Valid Trending Setup (Generates Buy Signal)
  const strongUpTrend = createLinearTrendCandles(100, 0.4, 250); // clear bullish slope
  const inputs1: UnifiedPipelineInputs = {
    ...defaultBaseInputs,
    primaryCandles: strongUpTrend,
    historicalWinRate: 0.65
  };
  assertSignalResult("1. Valid High-Probability Trending Setup", inputs1, "SIGNAL");

  // Scenario 2: Weak Setup (Low Score rejection)
  // Generating a completely flat, non-moving sequence -> strategies evaluate to HOLD -> low score
  const flatChoppy = createLinearTrendCandles(100, 0.0, 100);
  const inputs2: UnifiedPipelineInputs = {
    ...defaultBaseInputs,
    primaryCandles: flatChoppy
  };
  assertSignalResult("2. Weak Ranging Setup (Scoring Rejection)", inputs2, "NO_TRADE", "falls below minimum");

  // Scenario 3: Conflicting Strategies (Neutral Hold)
  // Generates flat range with high relative noise so that EMA stacks contradict RSI extremes, causing ties
  const highlyVolatileFlat = createLinearTrendCandles(100, 0.0, 50); // flat trend
  const inputs3: UnifiedPipelineInputs = {
    ...defaultBaseInputs,
    primaryCandles: highlyVolatileFlat
  };
  assertSignalResult("3. Conflicting Structural Setup (Tied Neutral Hold)", inputs3, "NO_TRADE", "lacks unified direction");

  // Scenario 4: Stale Data Protection active (Risk Guard rejection)
  const inputs4: UnifiedPipelineInputs = {
    ...defaultBaseInputs,
    primaryCandles: strongUpTrend,
    dataAgeMs: 9500 // exceeds 5s threshold
  };
  assertSignalResult("4. Stale Data Protection Active", inputs4, "NO_TRADE", "Price data is stale");

  // Scenario 5: Provider failure / Insufficient data (Fallback state protection)
  const inputs5: UnifiedPipelineInputs = {
    ...defaultBaseInputs,
    primaryCandles: strongUpTrend.slice(0, 5) // only 5 candles
  };
  assertSignalResult("5. Provider Failure / Fallback Shield Active", inputs5, "NO_TRADE", "Expected value calculation is unavailable");

  // Scenario 6: Drawdown Limit breached (Critical Risk Guard suspension)
  const inputs6: UnifiedPipelineInputs = {
    ...defaultBaseInputs,
    primaryCandles: strongUpTrend,
    currentDailyDrawdown: 600 // limit is 500
  };
  assertSignalResult("6. Account Risk Guard Drawdown Breach Block", inputs6, "NO_TRADE", "drawdown limit breached");

  // Scenario 7: Score below threshold (Artificially set scoring cap)
  const inputs7: UnifiedPipelineInputs = {
    ...defaultBaseInputs,
    primaryCandles: strongUpTrend,
    riskConfig: { ...defaultTestConfig, minimumSignalScore: 99 } // ridiculously high score threshold
  };
  assertSignalResult("7. Score below customized high threshold block", inputs7, "NO_TRADE", "below minimum requirement");

  // Scenario 8: High-Quality Confluence Setup (Generates Perfect Signal with ML available)
  const inputs8: UnifiedPipelineInputs = {
    ...defaultBaseInputs,
    primaryCandles: strongUpTrend,
    mlProbability: 0.88, // 88% probability
    historicalWinRate: 0.65
  };
  assertSignalResult("8. Ultimate High-Quality Confluence Setup (ML Supported)", inputs8, "SIGNAL", "clean signal generated");

  // =========================================================================
  // OVERALL STATUS SUMMARY
  // =========================================================================
  console.log("============================================================");
  console.log(`      VERIFICATION SUMMARY: ${passedCount}/${totalCount} TESTS PASSED.`);
  if (passedCount === totalCount) {
    console.log("🎉 ALL UNIFIED SIGNAL PIPELINE TESTS PASSED AND COMPLETED!");
  } else {
    console.log("❌ PIPELINE ORCHESTRATION FAILED ENSEMBLE STEPS.");
    process.exit(1);
  }
  console.log("============================================================");
}

runUnifiedSignalTests();
