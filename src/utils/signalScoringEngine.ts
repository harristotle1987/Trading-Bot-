export interface ScoreInputs {
  trendScore: number;          // 0 to 15 (raw points scored or ratio)
  momentumScore: number;       // 0 to 15
  marketRegimeScore: number;   // 0 to 15
  strategyAgreementScore: number; // 0 to 15
  mlProbability: number | null; // 0.0 to 1.0, or null if unavailable
  volumeScore: number;         // 0 to 10
  volatilityScore: number;     // 0 to 5
  mtfScore: number;            // 0 to 5
}

export interface ScoreBreakdown {
  trendPoints: number;
  momentumPoints: number;
  marketRegimePoints: number;
  strategyAgreementPoints: number;
  mlPoints: number | null;
  volumePoints: number;
  volatilityPoints: number;
  mtfPoints: number;
  rawSum: number;
  maxPossible: number;
}

export interface SignalScoreReport {
  signalScore: number; // 0 to 100
  scoreBreakdown: ScoreBreakdown;
  strategyAgreement: string;
  reasons: string[];
}

export class SignalScoringEngine {
  /**
   * Evaluates the metrics and returns a standardized 0-100 signal quality score.
   */
  static calculateScore(inputs: ScoreInputs, agreementRatioStr: string = "0/0"): SignalScoreReport {
    const reasons: string[] = [];
    
    // Bounds checking & clamping of inputs to their maximum weights
    const trend = Math.min(15, Math.max(0, inputs.trendScore));
    const momentum = Math.min(15, Math.max(0, inputs.momentumScore));
    const regime = Math.min(15, Math.max(0, inputs.marketRegimeScore));
    const strategyAgreement = Math.min(15, Math.max(0, inputs.strategyAgreementScore));
    const volume = Math.min(10, Math.max(0, inputs.volumeScore));
    const volatility = Math.min(5, Math.max(0, inputs.volatilityScore));
    const mtf = Math.min(5, Math.max(0, inputs.mtfScore));

    const isMlAvailable = inputs.mlProbability !== null && inputs.mlProbability !== undefined;
    let mlPoints = null;
    let rawSum = trend + momentum + regime + strategyAgreement + volume + volatility + mtf;
    let maxPossible = 80; // Sum of non-ML category weights (15+15+15+15+10+5+5)

    if (isMlAvailable) {
      const p = Math.min(1, Math.max(0, inputs.mlProbability!));
      // ML Probability provides up to 20 points
      mlPoints = parseFloat((p * 20).toFixed(2));
      rawSum += mlPoints;
      maxPossible = 100;
      reasons.push(`Machine Learning model returned probability ${(p * 100).toFixed(1)}% (+${mlPoints.toFixed(1)} pts)`);
    } else {
      reasons.push("Machine Learning probability is currently unavailable. Scoring scaled proportionally using 80-point non-ML baseline.");
    }

    // Standardize score to 0 - 100 scale
    const rawScore = maxPossible > 0 ? (rawSum / maxPossible) * 100 : 0;
    const signalScore = Math.min(100, Math.max(0, Math.round(rawScore)));

    // Categorized descriptive reasons based on score ranges
    if (signalScore >= 85) {
      reasons.push("Highly aligned high-conviction confluence signal.");
    } else if (signalScore >= 70) {
      reasons.push("Moderate-to-high conviction confluence signal.");
    } else if (signalScore >= 50) {
      reasons.push("Neutral baseline signal. Proceed with cautious positioning.");
    } else {
      reasons.push("Weak sub-standard signal. High risk of choppy execution or ranging whipsaws.");
    }

    return {
      signalScore,
      scoreBreakdown: {
        trendPoints: trend,
        momentumPoints: momentum,
        marketRegimePoints: regime,
        strategyAgreementPoints: strategyAgreement,
        mlPoints,
        volumePoints: volume,
        volatilityPoints: volatility,
        mtfPoints: mtf,
        rawSum: parseFloat(rawSum.toFixed(2)),
        maxPossible
      },
      strategyAgreement: agreementRatioStr,
      reasons
    };
  }
}
