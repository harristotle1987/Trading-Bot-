export interface CanonicalSignal {
  symbol: string;
  direction: 'BUY' | 'SELL' | string;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  timeframe: string;
  signalScore: number;
  mlProbability: number;
  expectedValue: number;
  marketRegime: string;
}

export interface MT4Presentation {
  symbol: string;
  direction: string;
  entry: string;
  stopInvalidation: string;
  target: string;
  timeframe: string;
  signalScore: string;
  mlProbability: string;
  expectedValue: string;
  marketRegime: string;
  isValid: boolean;
  errorReason?: string;
}

/**
 * Adapter from Canonical Signal to MT4/MT5 Presentation
 * Pure transformation, no strategy logic.
 */
export function adaptCanonicalToMT4(signal: CanonicalSignal): MT4Presentation {
  const isBuy = signal.direction === 'BUY';
  const isSell = signal.direction === 'SELL';
  
  if (!isBuy && !isSell) {
    return {
      symbol: signal.symbol || 'UNKNOWN',
      direction: signal.direction || 'INVALID',
      entry: '---',
      stopInvalidation: '---',
      target: '---',
      timeframe: signal.timeframe || '---',
      signalScore: '---',
      mlProbability: '---',
      expectedValue: '---',
      marketRegime: '---',
      isValid: false,
      errorReason: `Invalid direction: ${signal.direction}. Must be BUY or SELL.`
    };
  }

  // Basic sanity checks for invalidation
  if (signal.entryPrice <= 0 || signal.stopLoss <= 0 || signal.takeProfit <= 0) {
    return {
      symbol: signal.symbol,
      direction: signal.direction,
      entry: signal.entryPrice.toFixed(5),
      stopInvalidation: signal.stopLoss.toFixed(5),
      target: signal.takeProfit.toFixed(5),
      timeframe: signal.timeframe,
      signalScore: signal.signalScore.toString(),
      mlProbability: signal.mlProbability.toString(),
      expectedValue: signal.expectedValue.toString(),
      marketRegime: signal.marketRegime,
      isValid: false,
      errorReason: 'Prices must be greater than zero.'
    };
  }

  if (isBuy && signal.stopLoss >= signal.entryPrice) {
    return {
      ...createValidPresentation(signal),
      isValid: false,
      errorReason: 'Invalid BUY: Stop Loss must be below Entry.'
    };
  }

  if (isBuy && signal.takeProfit <= signal.entryPrice) {
    return {
      ...createValidPresentation(signal),
      isValid: false,
      errorReason: 'Invalid BUY: Take Profit must be above Entry.'
    };
  }

  if (isSell && signal.stopLoss <= signal.entryPrice) {
    return {
      ...createValidPresentation(signal),
      isValid: false,
      errorReason: 'Invalid SELL: Stop Loss must be above Entry.'
    };
  }

  if (isSell && signal.takeProfit >= signal.entryPrice) {
    return {
      ...createValidPresentation(signal),
      isValid: false,
      errorReason: 'Invalid SELL: Take Profit must be below Entry.'
    };
  }

  return createValidPresentation(signal);
}

function createValidPresentation(signal: CanonicalSignal): MT4Presentation {
  return {
    symbol: signal.symbol,
    direction: signal.direction,
    entry: signal.entryPrice.toFixed(5),
    stopInvalidation: signal.stopLoss.toFixed(5),
    target: signal.takeProfit.toFixed(5),
    timeframe: signal.timeframe,
    signalScore: `${signal.signalScore.toFixed(1)}/100`,
    mlProbability: `${(signal.mlProbability * 100).toFixed(1)}%`,
    expectedValue: `${signal.expectedValue > 0 ? '+' : ''}${signal.expectedValue.toFixed(4)}`,
    marketRegime: signal.marketRegime,
    isValid: true
  };
}
