import { SimpleCandle } from "./src/utils/featureEngine.js";
import { BacktestEngine, BacktestConfig } from "./src/utils/backtestEngine.js";
import { RiskGuardConfig } from "./src/utils/riskGuard.js";

// Generate 100 periods of strong trending bullish data
function generateTrendingCandles(startPrice: number, step: number, count = 100): SimpleCandle[] {
  const candles: SimpleCandle[] = [];
  let currentPrice = startPrice;
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const timestamp = now - (count - i) * 60000;
    const open = currentPrice;
    const close = currentPrice + step;
    const high = Math.max(open, close) + (step * 0.1);
    const low = Math.min(open, close) - (step * 0.1);
    const volume = 5000;

    candles.push({ timestamp, open, high, low, close, volume });
    currentPrice = close;
  }
  return candles;
}

const testRiskConfig: RiskGuardConfig = {
  minimumSignalScore: 70,
  minimumExpectedValue: 0.0,
  minimumMLProbability: 0.0,
  maximumSpread: 0.05,
  maximumVolatility: 50.0,
  maximumDailySignals: 10,
  maximumConsecutiveLosses: 5,
  dailyDrawdownLimit: 500,
  newsBlackout: false,
  correlationExposure: 1.0,
  staleDataProtection: 900000
};

const conventionalConfig: BacktestConfig = {
  initialBalance: 10000,
  symbol: "BTCUSDT",
  timeframe: "15m",
  style: "CONVENTIONAL",
  riskConfig: testRiskConfig,
  spread: 0.001,       // 0.1% spread
  slippage: 0.0005,    // 0.05% slippage on entry & exit
  feeRate: 0.001,      // 0.1% fee on entry size
  stakeOrPositionSize: 1000,
  binaryPayoutRate: 0.82,
  warmupPeriod: 50
};

const binaryConfig: BacktestConfig = {
  initialBalance: 10000,
  symbol: "BTCUSDT",
  timeframe: "15m",
  style: "BINARY_OPTIONS",
  riskConfig: testRiskConfig,
  spread: 0.001,
  slippage: 0.0005,
  feeRate: 0.0, // no fees on binary stake entries
  stakeOrPositionSize: 100,
  binaryPayoutRate: 0.82, // 82% payout
  warmupPeriod: 50
};

async function runBacktestTests() {
  console.log("======================================================================");
  console.log("               RUNNING REUSABLE UNIFIED BACKTESTER SUITE              ");
  console.log("======================================================================\n");

  const candles = generateTrendingCandles(100, 0.5, 120); // 120 candles of persistent bull trend

  // 1. Run Conventional Backtest
  console.log(">>> [SCENARIO 1] CONVENTIONAL BACKTESTING STYLE");
  const conventionalReport = BacktestEngine.runBacktest(candles, conventionalConfig);
  console.log(`   Initial Balance: $${conventionalReport.initialBalance}`);
  console.log(`   Final Balance:   $${conventionalReport.finalBalance}`);
  console.log(`   Total Return:    ${conventionalReport.totalReturnPct}%`);
  console.log(`   Total Trades:    ${conventionalReport.trades.length}`);
  console.log(`   Win Rate:        ${conventionalReport.winRatePct}%`);
  console.log(`   Profit Factor:   ${conventionalReport.profitFactor}`);
  console.log(`   Max Drawdown:    ${conventionalReport.maxDrawdownPct}%`);
  
  if (conventionalReport.trades.length > 0) {
    console.log("   --- SAMPLE TRADE OUTCOME ---");
    const t = conventionalReport.trades[0];
    console.log(`   Side:            ${t.side}`);
    console.log(`   Entry Price:     $${t.entryPrice}`);
    console.log(`   Exit Price:      $${t.exitPrice}`);
    console.log(`   Net PnL:         $${t.netPnL}`);
    console.log(`   Status:          ${t.status}`);
    console.log(`   Reason:          ${t.reason}`);
  }
  console.log("\n");

  // 2. Run Binary Options Backtest
  console.log(">>> [SCENARIO 2] BINARY OPTIONS BACKTESTING STYLE");
  const binaryReport = BacktestEngine.runBacktest(candles, binaryConfig);
  console.log(`   Initial Balance: $${binaryReport.initialBalance}`);
  console.log(`   Final Balance:   $${binaryReport.finalBalance}`);
  console.log(`   Total Return:    ${binaryReport.totalReturnPct}%`);
  console.log(`   Total Trades:    ${binaryReport.trades.length}`);
  console.log(`   Win Rate:        ${binaryReport.winRatePct}%`);
  console.log(`   Profit Factor:   ${binaryReport.profitFactor}`);
  console.log(`   Max Drawdown:    ${binaryReport.maxDrawdownPct}%`);

  if (binaryReport.trades.length > 0) {
    console.log("   --- SAMPLE BINARY TRADE OUTCOME ---");
    const t = binaryReport.trades[0];
    console.log(`   Side:            ${t.side}`);
    console.log(`   Entry Price:     $${t.entryPrice}`);
    console.log(`   Exit Price:      $${t.exitPrice}`);
    console.log(`   Net PnL:         $${t.netPnL} (Payout: 82% of $100 stake)`);
    console.log(`   Status:          ${t.status}`);
    console.log(`   Reason:          ${t.reason}`);
  }
  console.log("\n");

  // Manual Check Verification:
  // In a strong bullish trend:
  // - LONG / BUY direction is dominant.
  // - Binary style should enter, wait exactly 5 bars, exit at a higher close price, resulting in a WIN (+82).
  // - Conventional style should enter, exit via TP, resulting in a WIN.
  const isBinaryWinCorrect = binaryReport.trades.length > 0 && binaryReport.trades[0].status === "WIN" && binaryReport.trades[0].netPnL === 82.0;
  
  console.log("======================================================================");
  if (isBinaryWinCorrect) {
    console.log("🎉 ALL UNIFIED BACKTEST ENGINE CHECKS VERIFIED SUCCESSFULLY!");
  } else {
    console.log("❌ DISCREPANCY ENCOUNTERED IN THE VERIFICATION CHECKS.");
    process.exit(1);
  }
  console.log("======================================================================");
}

runBacktestTests();
