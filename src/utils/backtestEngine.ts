import { SimpleCandle } from "./featureEngine.js";
import { RiskGuardConfig } from "./riskGuard.js";
import { UnifiedSignalEngine, UnifiedPipelineInputs, SignalPayload } from "./unifiedSignalEngine.js";

export interface BacktestConfig {
  initialBalance: number;
  symbol: string;
  timeframe: string;
  style: "CONVENTIONAL" | "BINARY_OPTIONS";
  riskConfig: RiskGuardConfig;
  spread: number;
  slippage: number; // in absolute price or percentage (e.g. 0.0002 for 0.02% slippage)
  feeRate: number;  // transaction fee percentage (e.g. 0.0005 for 0.05% broker commission)
  stakeOrPositionSize: number; // flat entry size/stake per trade (e.g. 100)
  binaryPayoutRate: number;    // default payout rate e.g. 0.82 (82%)
  warmupPeriod: number;        // number of historical bars needed for feature indicators (default 50)
  evalStartIndex?: number;     // optional subset trade execution start bound
  evalEndIndex?: number;       // optional subset trade execution end bound
}

export interface BacktestTrade {
  id: number;
  symbol: string;
  side: "LONG" | "SHORT";
  entryPrice: number;
  exitPrice: number;
  netPnL: number;
  entryTime: string;
  exitTime: string;
  status: "WIN" | "LOSS";
  reason: string;
}

export interface EquityPoint {
  time: string;
  equity: number;
  drawdown: number;
}

export interface BacktestReport {
  id: number;
  symbol: string;
  timeframe: string;
  style: "CONVENTIONAL" | "BINARY_OPTIONS";
  initialBalance: number;
  finalBalance: number;
  totalReturnPct: number;
  sharpeRatio: number;
  maxDrawdownPct: number;
  winRatePct: number;
  profitFactor: number;
  trades: BacktestTrade[];
  equityCurve: EquityPoint[];
  createdAt: string;
}

export class BacktestEngine {
  /**
   * Runs a historical backtest of the quantitative strategies on the provided array of candles.
   * Feeds historical slices into the unified signal engine to enforce zero-lookahead.
   */
  static runBacktest(candles: SimpleCandle[], config: BacktestConfig): BacktestReport {
    const reportId = Math.floor(Math.random() * 1000000);
    const signalEngine = new UnifiedSignalEngine();
    
    let balance = config.initialBalance;
    let peakBalance = balance;
    let maxDrawdown = 0;
    
    const trades: BacktestTrade[] = [];
    const equityCurve: EquityPoint[] = [];
    
    // Track daily parameters for RiskGuard
    let consecutiveLosses = 0;
    let dailySignalsCount = 0;
    let currentDailyDrawdown = 0;

    // We step through candles index by index to simulate live price action without future bias
    let i = config.warmupPeriod;
    const evalStart = config.evalStartIndex !== undefined ? config.evalStartIndex : config.warmupPeriod;
    const evalEnd = config.evalEndIndex !== undefined ? config.evalEndIndex : candles.length - 1;
    
    while (i < candles.length) {
      const currentCandle = candles[i];
      const slice = candles.slice(0, i); // past candles only
      
      // Update equity curve point prior to potential trade entry
      peakBalance = Math.max(peakBalance, balance);
      const currentDrawdown = peakBalance > 0 ? ((peakBalance - balance) / peakBalance) * 100 : 0;
      maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
      
      equityCurve.push({
        time: new Date(currentCandle.timestamp).toISOString(),
        equity: parseFloat(balance.toFixed(2)),
        drawdown: parseFloat(currentDrawdown.toFixed(2))
      });

      // Prepare input for our unified production signal engine pipeline
      const pipelineInputs: UnifiedPipelineInputs = {
        symbol: config.symbol,
        assetClass: config.style === "BINARY_OPTIONS" ? "binary" : "crypto",
        timeframe: config.timeframe,
        primaryCandles: slice,
        riskConfig: config.riskConfig,
        spread: config.spread,
        dailySignalsCount,
        consecutiveLossesCount: consecutiveLosses,
        currentDailyDrawdown,
        isNewsBlackoutActive: false,
        currentCorrelationExposure: 0.1, // low correlation base
        dataAgeMs: 50,                   // perfectly fresh
        stakeOrPositionSize: config.stakeOrPositionSize,
        payoutRate: config.binaryPayoutRate,
        averageWin: config.stakeOrPositionSize * 1.5,
        averageLoss: config.stakeOrPositionSize,
        costEstimate: config.feeRate * config.stakeOrPositionSize,
        historicalWinRate: 0.60
      };

      if (i >= evalStart && i <= evalEnd) {
        const signal = signalEngine.generateSignal(pipelineInputs);

        // Check if pipeline produces an active signal (BUY -> CALL, SELL -> PUT)
        if (signal.status === "SIGNAL" && (signal.direction === "BUY" || signal.direction === "SELL")) {
          const side = signal.direction === "BUY" ? "LONG" : "SHORT";
          const entryPrice = currentCandle.open;
          
          // Apply Spread and Slippage to entry price
          // - Longs buy at Ask (price + half spread), Shorts sell at Bid (price - half spread)
          // - Slippage further degrades the entry price for both direction types
          let executedEntryPrice = entryPrice;
          if (side === "LONG") {
            executedEntryPrice = entryPrice * (1 + (config.spread / 2) + config.slippage);
          } else {
            executedEntryPrice = entryPrice * (1 - (config.spread / 2) - config.slippage);
          }

          // Apply trade execution fee
          const entryFee = config.stakeOrPositionSize * config.feeRate;
          balance -= entryFee;

          // Simulate subsequent candles to resolve trade outcomes
          let tradeResolved = false;
          let exitPrice = currentCandle.close;
          let exitTime = currentCandle.timestamp;
          let netPnL = 0;
          let outcome: "WIN" | "LOSS" = "LOSS";
          let exitReason = "Exceeded simulation window";

          let tradeDuration = 0;

          if (config.style === "BINARY_OPTIONS") {
            // Binary Options Style Execution:
            // Binary expires after a short fixed duration (e.g., 5 bars)
            const binaryExpiryBars = 5;
            const expirationIndex = Math.min(candles.length - 1, i + binaryExpiryBars);
            const expiryCandle = candles[expirationIndex];
            
            exitPrice = expiryCandle.close;
            exitTime = expiryCandle.timestamp;
            tradeDuration = expirationIndex - i;

            // Standard Binary contract rules: Correct forecast is ABOVE/BELOW entry price at expiration
            if (side === "LONG") {
              if (exitPrice > executedEntryPrice) {
                outcome = "WIN";
                netPnL = config.stakeOrPositionSize * config.binaryPayoutRate;
              } else {
                outcome = "LOSS";
                netPnL = -config.stakeOrPositionSize;
              }
            } else {
              if (exitPrice < executedEntryPrice) {
                outcome = "WIN";
                netPnL = config.stakeOrPositionSize * config.binaryPayoutRate;
              } else {
                outcome = "LOSS";
                netPnL = -config.stakeOrPositionSize;
              }
            }
            
            exitReason = `Binary contract expired after ${tradeDuration} periods.`;
            tradeResolved = true;
            // Step simulated time forward past trade execution window
            i = expirationIndex;
            
          } else {
            // Conventional Stop-Loss and Take-Profit Execution:
            const atr = currentCandle.high - currentCandle.low || 1.0;
            // Targets: TP at 2.0 ATR, SL at 1.0 ATR
            const tpDistance = atr * 2.0;
            const slDistance = atr * 1.0;
            
            const tpLevel = side === "LONG" ? executedEntryPrice + tpDistance : executedEntryPrice - tpDistance;
            const slLevel = side === "LONG" ? executedEntryPrice - slDistance : executedEntryPrice + slDistance;

            let j = i + 1;
            while (j < candles.length) {
              const nextCandle = candles[j];
              tradeDuration++;

              if (side === "LONG") {
                if (nextCandle.low <= slLevel) {
                  outcome = "LOSS";
                  exitPrice = slLevel;
                  exitReason = "Stop Loss breached";
                  tradeResolved = true;
                  break;
                }
                if (nextCandle.high >= tpLevel) {
                  outcome = "WIN";
                  exitPrice = tpLevel;
                  exitReason = "Take Profit triggered";
                  tradeResolved = true;
                  break;
                }
              } else {
                if (nextCandle.high >= slLevel) {
                  outcome = "LOSS";
                  exitPrice = slLevel;
                  exitReason = "Stop Loss breached";
                  tradeResolved = true;
                  break;
                }
                if (nextCandle.low <= tpLevel) {
                  outcome = "WIN";
                  exitPrice = tpLevel;
                  exitReason = "Take Profit triggered";
                  tradeResolved = true;
                  break;
                }
              }

              // Signal expiration maximum duration fallback
              if (tradeDuration >= 24) {
                outcome = nextCandle.close > executedEntryPrice ? (side === "LONG" ? "WIN" : "LOSS") : (side === "LONG" ? "LOSS" : "WIN");
                exitPrice = nextCandle.close;
                exitReason = "Time-based signal expiry reached (24 bars max duration)";
                tradeResolved = true;
                break;
              }

              j++;
            }

            if (tradeResolved) {
              // Apply slippage to exits
              let finalExitPrice = exitPrice;
              if (outcome === "WIN") {
                finalExitPrice = side === "LONG" ? exitPrice * (1 - config.slippage) : exitPrice * (1 + config.slippage);
              } else {
                finalExitPrice = side === "LONG" ? exitPrice * (1 - config.slippage) : exitPrice * (1 + config.slippage);
              }

              const grossReturn = side === "LONG" 
                ? (finalExitPrice - executedEntryPrice) / executedEntryPrice 
                : (executedEntryPrice - finalExitPrice) / executedEntryPrice;

              netPnL = config.stakeOrPositionSize * grossReturn;
              
              // Subtract exit commission fee
              const exitFee = config.stakeOrPositionSize * config.feeRate;
              netPnL -= exitFee;
              
              i = j; // update step iterator to exit bar
            }
          }

          if (tradeResolved) {
            balance += netPnL;
            dailySignalsCount++;
            
            if (outcome === "WIN") {
              consecutiveLosses = 0;
            } else {
              consecutiveLosses++;
              if (netPnL < 0) {
                currentDailyDrawdown += Math.abs(netPnL);
              }
            }

            trades.push({
              id: trades.length + 1,
              symbol: config.symbol,
              side,
              entryPrice: parseFloat(executedEntryPrice.toFixed(5)),
              exitPrice: parseFloat(exitPrice.toFixed(5)),
              netPnL: parseFloat(netPnL.toFixed(2)),
              entryTime: new Date(currentCandle.timestamp).toISOString(),
              exitTime: new Date(exitTime).toISOString(),
              status: outcome,
              reason: exitReason
            });
          }
        }
      }

      i++;
    }

    // End equity curve evaluation
    peakBalance = Math.max(peakBalance, balance);
    const endDrawdown = peakBalance > 0 ? ((peakBalance - balance) / peakBalance) * 100 : 0;
    equityCurve.push({
      time: new Date(candles[candles.length - 1].timestamp).toISOString(),
      equity: parseFloat(balance.toFixed(2)),
      drawdown: parseFloat(endDrawdown.toFixed(2))
    });

    // Compute backtester performance metrics
    const finalBalance = balance;
    const totalReturnPct = ((finalBalance - config.initialBalance) / config.initialBalance) * 100;
    
    const winningTrades = trades.filter(t => t.status === "WIN");
    const winRatePct = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

    const totalWinsPnL = winningTrades.reduce((acc, curr) => acc + curr.netPnL, 0);
    const losingTrades = trades.filter(t => t.status === "LOSS");
    const totalLossesPnL = losingTrades.reduce((acc, curr) => acc + Math.abs(curr.netPnL), 0);
    const profitFactor = totalLossesPnL > 0 ? totalWinsPnL / totalLossesPnL : totalWinsPnL > 0 ? 99.9 : 0;

    // Evaluate Sharpe Ratio
    // standard deviation of trade profits
    let sharpeRatio = 0.0;
    if (trades.length > 1) {
      const pnls = trades.map(t => t.netPnL);
      const mean = pnls.reduce((acc, v) => acc + v, 0) / pnls.length;
      const variance = pnls.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (pnls.length - 1);
      const stdDev = Math.sqrt(variance);
      sharpeRatio = stdDev > 0 ? (mean / stdDev) * Math.sqrt(252) : 0.0; // annualized standard scaling
    }

    return {
      id: reportId,
      symbol: config.symbol,
      timeframe: config.timeframe,
      style: config.style,
      initialBalance: config.initialBalance,
      finalBalance: parseFloat(finalBalance.toFixed(2)),
      totalReturnPct: parseFloat(totalReturnPct.toFixed(2)),
      sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
      maxDrawdownPct: parseFloat(maxDrawdown.toFixed(2)),
      winRatePct: parseFloat(winRatePct.toFixed(2)),
      profitFactor: parseFloat(profitFactor.toFixed(2)),
      trades,
      equityCurve,
      createdAt: new Date().toISOString()
    };
  }
}
