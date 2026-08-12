import { FeatureSet, QuantitativeFeatureEngine, SimpleCandle } from "./featureEngine.js";
import { MarketRegimeClassifier, MarketRegimeType } from "./regimeClassifier.js";
import { StrategyEnsemble, StrategyEnsembleReport } from "./strategyEnsemble.js";
import { ExpectedValueEngine, ExpectedValueReport } from "./expectedValueEngine.js";
import { SignalScoringEngine, ScoreInputs, SignalScoreReport } from "./signalScoringEngine.js";
import { RiskGuard, RiskGuardConfig, RiskGuardInputs, RiskGuardReport } from "./riskGuard.js";

export type AssetClassType = "crypto" | "forex" | "stock" | "binary";

export interface UnifiedPipelineInputs {
  symbol: string;
  assetClass: AssetClassType;
  timeframe: string;
  primaryCandles: SimpleCandle[];
  higherCandles?: SimpleCandle[];
  lowerCandles?: SimpleCandle[];
  
  // Configurations
  riskConfig: RiskGuardConfig;
  
  // Market / Account state context for Risk Guard
  spread: number;
  volatilityOverride?: number; // fallback ATR or value
  dailySignalsCount: number;
  consecutiveLossesCount: number;
  currentDailyDrawdown: number;
  isNewsBlackoutActive: boolean;
  currentCorrelationExposure: number;
  dataAgeMs: number;
  
  // Configurable Expiry
  configuredExpiryMs?: number;
  
  // Expected Value params
  stakeOrPositionSize: number;
  payoutRate?: number | null; // net profit rate for binary options (e.g. 0.82)
  averageWin?: number | null; // in cash for conventional
  averageLoss?: number | null; // in cash for conventional
  costEstimate?: number;      // in cash for conventional
  historicalWinRate?: number; // estimated win probability, if available

  // Machine Learning
  mlProbability?: number | null; // ML model prediction (0.0 to 1.0, or null if unavailable)
}

export interface SignalPayload {
  signalId: string;
  symbol: string;
  assetClass: AssetClassType;
  direction: "BUY" | "SELL" | "HOLD";
  timeframe: string;
  entry: number;
  marketRegime: MarketRegimeType;
  strategyAgreement: string;
  strategyResults: any[];
  historicalWinRate: number | null;
  mlProbability: number | null;
  expectedValue: number | null;
  signalScore: number;
  invalidation: number | null;
  expiry: number | null; // timestamp in ms
  validUntil: number;    // timestamp in ms
  status: "SIGNAL" | "NO_TRADE";
  createdAt: number;
  reasons: string[];
}

export class UnifiedSignalEngine {
  private ensemble: StrategyEnsemble;

  constructor() {
    this.ensemble = new StrategyEnsemble();
  }

  static generateSignal(inputs: UnifiedPipelineInputs): SignalPayload {
    return new UnifiedSignalEngine().generateSignal(inputs);
  }

  /**
   * Run the single authoritative signal-generation pipeline.
   * Connects all quantitative analytical subsystems.
   */
  generateSignal(inputs: UnifiedPipelineInputs): SignalPayload {
    const now = Date.now();
    const signalId = `SIG-${inputs.symbol}-${now}`;
    const reasons: string[] = [];

    // 1. Feature Engine Execution
    const features = QuantitativeFeatureEngine.generateFeatures({
      symbol: inputs.symbol,
      primaryCandles: inputs.primaryCandles,
      higherCandles: inputs.higherCandles,
      lowerCandles: inputs.lowerCandles,
      primaryTimeframe: inputs.timeframe
    });

    // P1-3: Use real market candle close as current price, not Bollinger middle
    const currentPrice = inputs.primaryCandles && inputs.primaryCandles.length > 0
      ? inputs.primaryCandles[inputs.primaryCandles.length - 1].close
      : (features.volatility.bbMiddle ?? 0);

    // 2. Market Regime Classification
    const regimeClass = MarketRegimeClassifier.classify(features);
    const regime = regimeClass.regime;

    // 3. Strategy Ensemble Run
    const ensembleReport = this.ensemble.evaluateEnsemble(features, regime);
    const direction = ensembleReport.dominant_direction;

    // 4. Expected Value Engine Run
    // P1-2: Do NOT equate strategy agreement with win probability.
    // Use historicalWinRate if available, or mlProbability if deployed; DO NOT fallback to agreement ratio.
    const rawPWin = inputs.historicalWinRate ?? (inputs.mlProbability ?? null);
    const pWin = rawPWin !== null ? Math.min(0.95, Math.max(0.05, rawPWin)) : null;

    let evReport: ExpectedValueReport;
    // P1-1: If real historical win rate or average win/loss is unavailable, expectedValue must be null.
    if (features.metadata.isFallback || features.metadata.candleCount < 20 || pWin === null) {
      evReport = {
        pWin: pWin ?? 0,
        pLoss: pWin !== null ? 1 - pWin : 0,
        expectedValue: null,
        costEstimate: inputs.costEstimate ?? 0,
        payout: null,
        calculationMethod: inputs.assetClass === "binary" ? "BINARY_OPTION" : "CONVENTIONAL"
      };
      reasons.push("Expected value is null because real historical win rate or ML prediction is unavailable.");
    } else if (inputs.assetClass === "binary") {
      if (inputs.payoutRate === null || inputs.payoutRate === undefined) {
        evReport = {
          pWin,
          pLoss: 1 - pWin,
          expectedValue: null,
          costEstimate: 0,
          payout: null,
          calculationMethod: "BINARY_OPTION"
        };
        reasons.push("Expected value is null because binary payout rate is not specified.");
      } else {
        evReport = ExpectedValueEngine.calculateBinary({
          pWin,
          stake: inputs.stakeOrPositionSize,
          payoutRate: inputs.payoutRate
        });
      }
    } else {
      // Conventional asset class
      if (inputs.averageWin === undefined || inputs.averageLoss === undefined || inputs.averageWin === null || inputs.averageLoss === null) {
        evReport = {
          pWin,
          pLoss: 1 - pWin,
          expectedValue: null,
          costEstimate: inputs.costEstimate ?? 0,
          payout: null,
          calculationMethod: "CONVENTIONAL"
        };
        reasons.push("Expected value is null because real historical average win/loss data is unavailable.");
      } else {
        evReport = ExpectedValueEngine.calculateConventional({
          pWin,
          averageWin: inputs.averageWin,
          averageLoss: inputs.averageLoss,
          costEstimate: inputs.costEstimate ?? 0
        });
      }
    }

    // 5. Signal Quality Scoring
    const scoreInputs = this.mapFeaturesToScoringInputs(features, ensembleReport, regime, regimeClass.confidence, inputs.mlProbability ?? null);
    const scoreReport = SignalScoringEngine.calculateScore(scoreInputs, ensembleReport.strategy_agreement);

    // 6. Risk Guard Check
    const atrVolatility = features.volatility.atr ?? inputs.volatilityOverride ?? 1.0;
    const riskInputs: RiskGuardInputs = {
      signalScore: scoreReport.signalScore,
      expectedValue: evReport.expectedValue,
      mlProbability: inputs.mlProbability ?? null,
      spread: inputs.spread,
      volatility: atrVolatility,
      dailySignalsCount: inputs.dailySignalsCount,
      consecutiveLossesCount: inputs.consecutiveLossesCount,
      currentDailyDrawdown: inputs.currentDailyDrawdown,
      isNewsBlackoutActive: inputs.isNewsBlackoutActive,
      currentCorrelationExposure: inputs.currentCorrelationExposure,
      dataAgeMs: inputs.dataAgeMs
    };

    const riskReport = RiskGuard.evaluateRisk(riskInputs, inputs.riskConfig);

    // Map entry reference and invalidation stops from strategies
    let entry_reference: number | null = null;
    let invalidation_reference: number | null = null;

    // Obtain from winning dominant strategy
    const activeResults = ensembleReport.strategy_results.filter(r => r.direction === direction);
    if (activeResults.length > 0) {
      // Find highest confidence strategy result
      const sortedResults = [...activeResults].sort((a, b) => b.confidence - a.confidence);
      entry_reference = sortedResults[0].entry_reference;
      invalidation_reference = sortedResults[0].invalidation_reference;
    }

    if (!entry_reference || entry_reference === 0) {
      entry_reference = currentPrice;
    }
    if (!invalidation_reference || invalidation_reference === 0) {
      invalidation_reference = direction === "BUY" ? currentPrice * 0.98 : currentPrice * 1.02;
    }

    // Validation boundary conditions
    const isDirectionActive = direction === "BUY" || direction === "SELL";
    const isScoreAboveMin = scoreReport.signalScore >= inputs.riskConfig.minimumSignalScore;
    const isAllowedByRisk = riskReport.allowed;

    let finalStatus: "SIGNAL" | "NO_TRADE" = "NO_TRADE";

    // Build overall pipeline reasons log
    if (!isDirectionActive) {
      reasons.push("Market conditions evaluated to HOLD. Strategy ensemble lacks unified direction.");
    }
    if (!isScoreAboveMin) {
      reasons.push(`Signal Score (${scoreReport.signalScore}) is below minimum requirement (${inputs.riskConfig.minimumSignalScore}).`);
    }
    if (!isAllowedByRisk) {
      reasons.push(...riskReport.reasons);
    }

    if (isDirectionActive && isScoreAboveMin && isAllowedByRisk) {
      finalStatus = "SIGNAL";
      reasons.push(`Clean signal generated with score ${scoreReport.signalScore}/100 and active regime ${regime}.`);
    }

    // P1-6: Configurable expiry & validUntil semantics
    let expiryOffsetMs = 3600000; // 1h default
    if (inputs.configuredExpiryMs && inputs.configuredExpiryMs > 0) {
      expiryOffsetMs = inputs.configuredExpiryMs;
    } else {
      const tf = inputs.timeframe.toLowerCase();
      if (tf === "1m" || tf === "1") expiryOffsetMs = 60000;
      else if (tf === "2m" || tf === "2") expiryOffsetMs = 120000;
      else if (tf === "5m" || tf === "5") expiryOffsetMs = 300000;
      else if (tf === "15m" || tf === "15") expiryOffsetMs = 900000;
      else if (tf === "30m" || tf === "30") expiryOffsetMs = 1800000;
      else if (tf === "1h" || tf === "60") expiryOffsetMs = 3600000;
      else if (tf === "4h" || tf === "240") expiryOffsetMs = 14400000;
      else if (tf === "1d" || tf === "d") expiryOffsetMs = 86400000;
      else if (inputs.assetClass === "binary") expiryOffsetMs = 60000;
    }
    const expiry = now + expiryOffsetMs;
    const validUntil = now + Math.min(15 * 60 * 1000, expiryOffsetMs);

    return {
      signalId,
      symbol: inputs.symbol,
      assetClass: inputs.assetClass,
      direction,
      timeframe: inputs.timeframe,
      entry: parseFloat(entry_reference.toFixed(5)),
      marketRegime: regime,
      strategyAgreement: ensembleReport.strategy_agreement,
      strategyResults: ensembleReport.strategy_results,
      historicalWinRate: inputs.historicalWinRate ?? null,
      mlProbability: inputs.mlProbability ?? null,
      expectedValue: evReport.expectedValue,
      signalScore: scoreReport.signalScore,
      invalidation: parseFloat(invalidation_reference.toFixed(5)),
      expiry,
      validUntil,
      status: finalStatus,
      createdAt: now,
      reasons
    };
  }

  /**
   * Maps live technical indicators to normalized points weights for Scoring engine.
   */
  private mapFeaturesToScoringInputs(
    features: FeatureSet,
    ensemble: StrategyEnsembleReport,
    regime: MarketRegimeType,
    regimeConfidence: number,
    mlProbability: number | null
  ): ScoreInputs {
    // A. Trend Score (Max 15)
    let trendScore = 0;
    const isTrendingBullish = ensemble.dominant_direction === "BUY" && (regime === "TRENDING_BULLISH" || features.multiTimeframe.primaryTimeframeTrend === "bullish");
    const isTrendingBearish = ensemble.dominant_direction === "SELL" && (regime === "TRENDING_BEARISH" || features.multiTimeframe.primaryTimeframeTrend === "bearish");
    
    if (isTrendingBullish || isTrendingBearish) {
      trendScore += 10;
    }
    if (features.trend.isBullishEMAStack && ensemble.dominant_direction === "BUY") {
      trendScore += 5;
    } else if (features.trend.ema20_slope !== null && Math.abs(features.trend.ema20_slope) > 0.001) {
      trendScore += 5;
    }

    // B. Momentum Score (Max 15)
    let momentumScore = 0;
    if (features.momentum.rsi !== null) {
      if (ensemble.dominant_direction === "BUY" && features.momentum.rsi > 50) {
        momentumScore += 10;
      } else if (ensemble.dominant_direction === "SELL" && features.momentum.rsi < 50) {
        momentumScore += 10;
      }
    }
    if (features.momentum.macdHistogram !== null && Math.abs(features.momentum.macdHistogram) > 0) {
      momentumScore += 5;
    }

    // C. Regime Score (Max 15)
    const marketRegimeScore = Math.min(15, Math.round(regimeConfidence * 15));

    // D. Strategy Agreement (Max 15)
    const strategyAgreementScore = Math.min(15, Math.round(ensemble.agreement_ratio * 15));

    // E. Volume Score (Max 10)
    let volumeScore = 0;
    if (features.volume.relativeVolume !== null) {
      volumeScore += Math.min(10, Math.round(features.volume.relativeVolume * 5));
    } else {
      volumeScore += 5; // default fallback
    }

    // F. Volatility Score (Max 5)
    let volatilityScore = 5; // healthy standard base volatility points

    // G. MTF Score (Max 5)
    let mtfScore = 5; // standard base confirmation points

    return {
      trendScore,
      momentumScore,
      marketRegimeScore,
      strategyAgreementScore,
      mlProbability,
      volumeScore,
      volatilityScore,
      mtfScore
    };
  }
}
