export interface RiskGuardConfig {
  minimumSignalScore: number;
  minimumExpectedValue: number;
  minimumMLProbability: number; // when ML is available
  maximumSpread: number;         // in percentage or absolute pips/value (e.g., 0.005 for 0.5% max spread)
  maximumVolatility: number;     // ATR or standard deviation threshold
  maximumDailySignals: number;   // cap on trades per day
  maximumConsecutiveLosses: number; // maximum consecutive losses allowed before shutdown
  dailyDrawdownLimit: number;    // maximum account equity loss in currency or percentage before suspension
  newsBlackout: boolean;         // disable trading during high impact economic calendar windows
  correlationExposure: number;   // maximum positive correlation score/index to prevent cluster risks
  staleDataProtection: number;   // maximum allowed age of price feed updates in milliseconds
}

export interface RiskGuardInputs {
  signalScore: number;
  expectedValue: number | null;
  mlProbability: number | null;  // null if ML is unavailable
  spread: number;
  volatility: number;
  dailySignalsCount: number;
  consecutiveLossesCount: number;
  currentDailyDrawdown: number;
  isNewsBlackoutActive: boolean;
  currentCorrelationExposure: number;
  dataAgeMs: number;
}

export type RiskLevel = "LOW" | "MODERATE" | "HIGH";

export interface RiskGuardReport {
  allowed: boolean;
  reasons: string[];
  riskLevel: RiskLevel;
}

export class RiskGuard {
  /**
   * Evaluates all configured risk filters against live signal metrics.
   * Never modifies market data or executes trades.
   */
  static evaluateRisk(inputs: RiskGuardInputs, config: RiskGuardConfig): RiskGuardReport {
    const reasons: string[] = [];

    // 1. Minimum Signal Score Filter
    if (inputs.signalScore < config.minimumSignalScore) {
      reasons.push(`Signal score ${inputs.signalScore} falls below minimum threshold of ${config.minimumSignalScore}`);
    }

    // 2. Minimum Expected Value Filter
    if (inputs.expectedValue === null) {
      reasons.push("Expected value calculation is unavailable (cannot verify positive expectancy)");
    } else if (inputs.expectedValue < config.minimumExpectedValue) {
      reasons.push(`Expected value $${inputs.expectedValue} is below minimum threshold of $${config.minimumExpectedValue}`);
    }

    // 3. Minimum ML Probability Filter (when ML is available)
    if (inputs.mlProbability !== null && inputs.mlProbability < config.minimumMLProbability) {
      reasons.push(`ML probability ${(inputs.mlProbability * 100).toFixed(1)}% is below minimum threshold of ${(config.minimumMLProbability * 100).toFixed(1)}%`);
    }

    // 4. Maximum Spread Filter
    if (inputs.spread > config.maximumSpread) {
      reasons.push(`Market spread ${inputs.spread} exceeds configured maximum of ${config.maximumSpread}`);
    }

    // 5. Maximum Volatility Filter
    if (inputs.volatility > config.maximumVolatility) {
      reasons.push(`Market volatility ${inputs.volatility} exceeds configured maximum of ${config.maximumVolatility}`);
    }

    // 6. Maximum Daily Signals Cap
    if (inputs.dailySignalsCount >= config.maximumDailySignals) {
      reasons.push(`Daily signals cap reached (${inputs.dailySignalsCount}/${config.maximumDailySignals})`);
    }

    // 7. Maximum Consecutive Losses Cap
    if (inputs.consecutiveLossesCount >= config.maximumConsecutiveLosses) {
      reasons.push(`Consecutive losses limit breached (${inputs.consecutiveLossesCount}/${config.maximumConsecutiveLosses})`);
    }

    // 8. Daily Drawdown Limit
    if (inputs.currentDailyDrawdown >= config.dailyDrawdownLimit) {
      reasons.push(`Daily drawdown limit breached ($${inputs.currentDailyDrawdown}/$${config.dailyDrawdownLimit})`);
    }

    // 9. News Blackout Filter
    if (config.newsBlackout && inputs.isNewsBlackoutActive) {
      reasons.push("Trading suspended: High-impact economic news release blackout is active");
    }

    // 10. Correlation Exposure Limit
    if (inputs.currentCorrelationExposure > config.correlationExposure) {
      reasons.push(`Correlation exposure ${inputs.currentCorrelationExposure} exceeds configured limit of ${config.correlationExposure}`);
    }

    // 11. Stale Data Protection Filter
    if (inputs.dataAgeMs > config.staleDataProtection) {
      reasons.push(`Price data is stale: Age of data is ${inputs.dataAgeMs}ms (maximum allowed is ${config.staleDataProtection}ms)`);
    }

    // Final decision mapping
    const allowed = reasons.length === 0;
    let riskLevel: RiskLevel = "LOW";

    if (!allowed) {
      // Determine severity of risk levels:
      // - Drawdown, consec losses, news blackout, or high correlation breaches elevate level immediately to HIGH
      const hasCriticalViolation = 
        inputs.currentDailyDrawdown >= config.dailyDrawdownLimit ||
        inputs.consecutiveLossesCount >= config.maximumConsecutiveLosses ||
        inputs.isNewsBlackoutActive ||
        inputs.dataAgeMs > config.staleDataProtection;

      if (hasCriticalViolation || reasons.length >= 3) {
        riskLevel = "HIGH";
      } else {
        riskLevel = "MODERATE";
      }
    }

    return {
      allowed,
      reasons,
      riskLevel
    };
  }
}
