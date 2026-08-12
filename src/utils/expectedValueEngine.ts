export type CalculationMethod = "CONVENTIONAL" | "BINARY_OPTION";

export interface ExpectedValueReport {
  pWin: number;
  pLoss: number;
  expectedValue: number | null; // null if unknown / unavailable
  costEstimate: number;
  payout: number | null;         // net profit per unit stake (e.g. 0.82 for 82% payout)
  calculationMethod: CalculationMethod;
}

export class ExpectedValueEngine {
  /**
   * Calculates Expected Value for Conventional Trading:
   * EV = (Pwin * Average Win) - (Ploss * Average Loss) - Costs
   */
  static calculateConventional(params: {
    pWin: number;         // probability of winning (0.0 to 1.0)
    averageWin: number;   // average profit in currency
    averageLoss: number;  // average loss in currency
    costEstimate?: number;// execution costs (spread, commissions, slippage)
  }): ExpectedValueReport {
    const pWin = Math.min(1, Math.max(0, params.pWin));
    const pLoss = parseFloat((1 - pWin).toFixed(4));
    const costEstimate = params.costEstimate ?? 0;

    const expectedValue = (pWin * params.averageWin) - (pLoss * params.averageLoss) - costEstimate;

    return {
      pWin,
      pLoss,
      expectedValue: parseFloat(expectedValue.toFixed(4)),
      costEstimate,
      payout: null,
      calculationMethod: "CONVENTIONAL"
    };
  }

  /**
   * Calculates Expected Value for Binary Options:
   * EV = (Pwin * Payout) - (Ploss * Stake)
   * where Payout is the net profit per unit stake (payoutRate * stake)
   */
  static calculateBinary(params: {
    pWin: number;            // probability of winning (0.0 to 1.0)
    stake: number;           // contract entry size / risk amount
    payoutRate?: number | null; // net profit rate per unit stake (e.g. 0.85 for 85%)
  }): ExpectedValueReport {
    const pWin = Math.min(1, Math.max(0, params.pWin));
    const pLoss = parseFloat((1 - pWin).toFixed(4));
    
    // If payout rate is missing/null/undefined or <= 0, mark EV as unavailable
    if (params.payoutRate === undefined || params.payoutRate === null || params.payoutRate <= 0) {
      return {
        pWin,
        pLoss,
        expectedValue: null,
        costEstimate: 0,
        payout: null,
        calculationMethod: "BINARY_OPTION"
      };
    }

    const payoutRate = params.payoutRate;
    const netProfit = payoutRate * params.stake;
    const expectedValue = (pWin * netProfit) - (pLoss * params.stake);

    return {
      pWin,
      pLoss,
      expectedValue: parseFloat(expectedValue.toFixed(4)),
      costEstimate: 0,
      payout: payoutRate,
      calculationMethod: "BINARY_OPTION"
    };
  }
}
