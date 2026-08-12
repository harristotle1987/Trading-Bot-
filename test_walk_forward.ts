import { SimpleCandle } from "./src/utils/featureEngine.js";
import { WalkForwardEngine } from "./src/utils/walkForwardEngine.js";
import { BacktestConfig } from "./src/utils/backtestEngine.js";
import { RiskGuardConfig } from "./src/utils/riskGuard.js";

// Generate 200 candles of trending bullish data with local cycles
function generateCyclicalCandles(startPrice: number, count = 200): SimpleCandle[] {
  const candles: SimpleCandle[] = [];
  let price = startPrice;
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const timestamp = now - (count - i) * 60000;
    // Add sinusoidal cyclical trend variance
    const variance = (Math.sin(i / 10) * (startPrice * 0.005)) + (startPrice * 0.001); 
    const open = price;
    const close = price + variance;
    const high = Math.max(open, close) + (startPrice * 0.001);
    const low = Math.min(open, close) - (startPrice * 0.001);
    const volume = 5000;

    candles.push({ timestamp, open, high, low, close, volume });
    price = close;
  }
  return candles;
}

const testRiskConfig: RiskGuardConfig = {
  minimumSignalScore: 65,
  minimumExpectedValue: 0.0,
  minimumMLProbability: 0.0,
  maximumSpread: 0.05,
  maximumVolatility: 50.0,
  maximumDailySignals: 20,
  maximumConsecutiveLosses: 5,
  dailyDrawdownLimit: 1000,
  newsBlackout: false,
  correlationExposure: 1.0,
  staleDataProtection: 90000000
};

const backtestConfig: BacktestConfig = {
  initialBalance: 10000,
  symbol: "BTCUSDT",
  timeframe: "15m",
  style: "CONVENTIONAL",
  riskConfig: testRiskConfig,
  spread: 0.0005,
  slippage: 0.0002,
  feeRate: 0.0005,
  stakeOrPositionSize: 1000,
  binaryPayoutRate: 0.85,
  warmupPeriod: 30
};

async function executeWalkForwardValidation() {
  console.log("======================================================================");
  console.log("             RUNNING THE WALK-FORWARD VALIDATION TEST SUITE            ");
  console.log("======================================================================\n");

  const candles = generateCyclicalCandles(100, 150);

  // 1. Run look-ahead bias checks
  console.log(">>> [TEST 1] DETECTING LOOK-AHEAD BIAS");
  const lookaheadResult = WalkForwardEngine.runLookAheadBiasTest(candles, backtestConfig);
  for (const log of lookaheadResult.logs) {
    console.log(`   ${log}`);
  }
  console.log("");

  // 2. Run rolling out-of-sample walk-forward test
  console.log(">>> [TEST 2] RUNNING ROLLING FOLDS (TRAIN/VALIDATION/TEST)");
  const report = WalkForwardEngine.runWalkForward(candles, backtestConfig, 60, 30);
  
  console.log(`   Overall Win Rate:      ${report.overallWinRatePct}%`);
  console.log(`   Overall Expectancy:    $${report.overallExpectancy}`);
  console.log(`   Overall Profit Factor: ${report.overallProfitFactor}`);
  console.log(`   Max Drawdown Pct:      ${report.overallMaxDrawdownPct}%`);
  console.log(`   Combined Sharpe:       ${report.overallSharpe}`);
  console.log(`   Combined Sortino:      ${report.overallSortino}`);
  console.log(`   Total Folds Evaluated: ${report.windows.length}`);
  console.log(`   Total Signal Trades:   ${report.overallTradeCount}`);
  console.log("");

  console.log("   --- PERFORMANCE BY MARKET REGIME ---");
  for (const r of report.performanceByRegime) {
    console.log(`   Regime: ${r.regime.toUpperCase()} | Count: ${r.tradeCount} | Win Rate: ${r.winRatePct.toFixed(1)}% | Net PnL: $${r.netPnL}`);
  }
  console.log("");

  console.log("   --- PERFORMANCE BY STRATEGY ---");
  for (const s of report.performanceByStrategy) {
    console.log(`   Strategy: ${s.strategy} | Count: ${s.tradeCount} | Win Rate: ${s.winRatePct.toFixed(1)}% | Net PnL: $${s.netPnL}`);
  }
  console.log("");

  const resultsSound = lookaheadResult.passed && report.overallTradeCount > 0;
  console.log("======================================================================");
  if (resultsSound) {
    console.log("🎉 WALK-FORWARD ROLLING WINDOW INTEGRITY VERIFIED SUCCESSFULLY!");
  } else {
    console.log("❌ CRITICAL CHECKS FAILED.");
    process.exit(1);
  }
  console.log("======================================================================");
}

executeWalkForwardValidation();
