export interface StrategyConfig {
  id: string;
  name: string;
  tagline: string;
  category: 'Day Trading' | 'Swing Trading' | 'Scalping' | 'Martingale' | 'Price Action' | 'Mean Reversion' | 'Momentum';
  description: string;
  recommendedTimeframe: string; // e.g. '15m'
  allowedTimeframes: string[]; // e.g. ['5m', '15m', '30m', '1h']
  defaultWinRate: number; // e.g. 92.5
  payoutRange: string; // e.g. '85% - 95%'
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'AGGRESSIVE';
  indicators: string[];
  bestAssetClasses: string[];
  parameters: {
    label: string;
    value: string | number;
    description: string;
  }[];
}

export const ALL_TIMEFRAMES = [
  { id: '30s', label: '30 Seconds', durationMs: 30 * 1000, category: 'Micro' },
  { id: '1m', label: '1 Minute', durationMs: 60 * 1000, category: 'Micro' },
  { id: '2m', label: '2 Minutes', durationMs: 2 * 60 * 1000, category: 'Micro' },
  { id: '3m', label: '3 Minutes', durationMs: 3 * 60 * 1000, category: 'Short' },
  { id: '5m', label: '5 Minutes', durationMs: 5 * 60 * 1000, category: 'Short' },
  { id: '15m', label: '15 Minutes', durationMs: 15 * 60 * 1000, category: 'Medium' },
  { id: '30m', label: '30 Minutes', durationMs: 30 * 60 * 1000, category: 'Medium' },
  { id: '1h', label: '1 Hour', durationMs: 60 * 60 * 1000, category: 'Intraday' },
  { id: '4h', label: '4 Hours', durationMs: 4 * 60 * 60 * 1000, category: 'Swing' },
  { id: '1d', label: '1 Day', durationMs: 24 * 60 * 60 * 1000, category: 'Macro' },
  { id: '1w', label: '1 Week', durationMs: 7 * 24 * 60 * 60 * 1000, category: 'Macro' },
  { id: '1mth', label: '1 Month', durationMs: 30 * 24 * 60 * 60 * 1000, category: 'Macro' }
];

export const TRADING_STRATEGIES: StrategyConfig[] = [
  {
    id: 'day-trading',
    name: 'Day Trading (VWAP & Intraday Momentum)',
    tagline: 'Captures institutional intraday volume pushes and session breakouts',
    category: 'Day Trading',
    description: 'Scans for session VWAP retests combined with 50/200 EMA golden/death crosses. Optimal for capturing clean directional moves during London & New York market overlaps.',
    recommendedTimeframe: '15m',
    allowedTimeframes: ['5m', '15m', '30m', '1h'],
    defaultWinRate: 91.8,
    payoutRange: '88% - 94%',
    riskLevel: 'MEDIUM',
    indicators: ['Session VWAP', 'EMA 50 / 200 Cross', 'RSI (14) Divergence', 'Volume Delta Imbalance'],
    bestAssetClasses: ['forex', 'crypto', 'stocks'],
    parameters: [
      { label: 'RSI Period', value: 14, description: 'Relative Strength Index calculation window' },
      { label: 'Fast EMA', value: 50, description: 'Short-term trend direction line' },
      { label: 'Slow EMA', value: 200, description: 'Institutional macro baseline filter' },
      { label: 'Min Delta Vol', value: '1,500 Contracts', description: 'Minimum orderbook buy/sell imbalance' }
    ]
  },
  {
    id: 'swing-trading',
    name: 'Swing Trading (Multi-Day Trend & Key S/R)',
    tagline: 'Exploits high-probability macro reversals and multi-candle liquidity sweeps',
    category: 'Swing Trading',
    description: 'Designed for high-accuracy binary and forex positions held over longer durations. Identifies key support/resistance zones, weekly liquidity sweeps, and Golden Fibonacci 61.8% retests.',
    recommendedTimeframe: '1d',
    allowedTimeframes: ['4h', '1d', '1w', '1mth'],
    defaultWinRate: 94.2,
    payoutRange: '85% - 92%',
    riskLevel: 'LOW',
    indicators: ['Weekly Liquidity Pool', '200 EMA Dynamic Line', 'Fibonacci 61.8% Golden Retest', 'Macro Order Block'],
    bestAssetClasses: ['crypto', 'forex', 'commodities'],
    parameters: [
      { label: 'Fib Level', value: '0.618 Golden Zone', description: 'Primary Fibonacci retest target' },
      { label: 'Lookback Candles', value: 200, description: 'Macro swing high/low lookback window' },
      { label: 'Confirmation Bar', value: 'Engulfing Close', description: 'Mandatory candle trigger filter' }
    ]
  },
  {
    id: 'scalping',
    name: 'Scalping / Binary Quick Shot',
    tagline: 'Ultra-fast 30s to 5m micro-breakouts and stochastic momentum blasts',
    category: 'Scalping',
    description: 'Engineered specifically for Pocket Option binary quick trades. Captures instant orderbook ticks and micro-momentum bursts with lightning execution speed.',
    recommendedTimeframe: '1m',
    allowedTimeframes: ['30s', '1m', '2m', '3m', '5m'],
    defaultWinRate: 89.5,
    payoutRange: '90% - 98%',
    riskLevel: 'AGGRESSIVE',
    indicators: ['Stochastic (5,3,3) Cross', '8 EMA Micro Line', 'Tick Volatility Spike', 'Order Flow Delta'],
    bestAssetClasses: ['forex', 'crypto'],
    parameters: [
      { label: 'Stoch %K', value: 5, description: 'Fast stochastic momentum sensitivity' },
      { label: 'Stoch %D', value: 3, description: 'Stochastic signal smoothing line' },
      { label: 'Overbought / Oversold', value: '80 / 20', description: 'Extreme threshold bands for quick reversal' }
    ]
  },
  {
    id: 'martingale-trend',
    name: 'Martingale / Trend Follow (Recovery Multipliers)',
    tagline: 'Strong directional trend riding with calculated 2-step recovery steps',
    category: 'Martingale',
    description: 'Combing strong ADX trend confirmation with auto-calculated 2-step Martingale safety multipliers (1x -> 2.2x -> 4.8x) to ensure peak win-rate consistency across Pocket Option cycles.',
    recommendedTimeframe: '2m',
    allowedTimeframes: ['1m', '2m', '3m', '5m', '15m'],
    defaultWinRate: 95.6,
    payoutRange: '88% - 95%',
    riskLevel: 'MEDIUM',
    indicators: ['Supertrend (10, 3)', 'ADX Trend Strength (>25)', '2.2x Martingale Calculation', 'Parabolic SAR'],
    bestAssetClasses: ['forex', 'crypto', 'commodities'],
    parameters: [
      { label: 'ADX Minimum', value: 25, description: 'Filter out weak or sideways consolidation' },
      { label: 'Step 1 Multiplier', value: '2.2x', description: 'Pocket Option recovery bet multiplier' },
      { label: 'Max Recovery Steps', value: 2, description: 'Safety max limit for consecutive steps' }
    ]
  },
  {
    id: 'price-action',
    name: 'Price Action & Pin Bar (Pure Structure)',
    tagline: 'Pure candlestick geometry, rejection tails, and Fair Value Gaps (FVG)',
    category: 'Price Action',
    description: 'No lag, purely structural price patterns. Detects long rejection wicks at supply/demand zones, bullish/bearish engulfing bars, and Fair Value Gap imbalances.',
    recommendedTimeframe: '1h',
    allowedTimeframes: ['15m', '30m', '1h', '4h', '1d'],
    defaultWinRate: 92.4,
    payoutRange: '86% - 93%',
    riskLevel: 'LOW',
    indicators: ['Rejection Pinbar', 'Fair Value Gap (FVG)', 'Supply/Demand Zone', 'Bar Reversal Ratio'],
    bestAssetClasses: ['forex', 'stocks', 'commodities'],
    parameters: [
      { label: 'Wick Ratio', value: '65% Minimum', description: 'Minimum rejection tail size relative to body' },
      { label: 'FVG Threshold', value: '0.15% Imbalance', description: 'Min gap distance between bar 1 and 3' }
    ]
  },
  {
    id: 'rsi-bollinger',
    name: 'RSI + Bollinger Mean Reversion',
    tagline: 'Statistical reversal triggers at 3-StdDev outer bands with RSI extremes',
    category: 'Mean Reversion',
    description: 'Captures snap-back mean reversion trades when price pierces extreme 3.0 Standard Deviation Bollinger Bands while RSI is heavily oversold (<25) or overbought (>75).',
    recommendedTimeframe: '5m',
    allowedTimeframes: ['1m', '3m', '5m', '15m', '1h'],
    defaultWinRate: 90.7,
    payoutRange: '88% - 94%',
    riskLevel: 'MEDIUM',
    indicators: ['Bollinger Bands (20, 3.0)', 'RSI (14) Extreme (<25/>75)', 'Keltner Channel Touch', 'Volume Exhaustion'],
    bestAssetClasses: ['forex', 'crypto', 'stocks'],
    parameters: [
      { label: 'BB StdDev', value: 3.0, description: 'Outer envelope deviation multiplier' },
      { label: 'RSI Oversold', value: 25, description: 'Ultra-oversold buy trigger' },
      { label: 'RSI Overbought', value: 75, description: 'Ultra-overbought sell trigger' }
    ]
  },
  {
    id: 'macd-zerolag',
    name: 'MACD Zero-Lag Crossover',
    tagline: 'Fast momentum shift detection via zero-lag histogram acceleration',
    category: 'Momentum',
    description: 'Eliminates traditional indicator lag by applying zero-lag exponential moving averages to MACD calculations, catching early trend acceleration before standard tools.',
    recommendedTimeframe: '15m',
    allowedTimeframes: ['5m', '15m', '30m', '1h', '4h'],
    defaultWinRate: 91.2,
    payoutRange: '87% - 93%',
    riskLevel: 'MEDIUM',
    indicators: ['Zero-Lag MACD (12,26,9)', 'Histogram Acceleration', 'EMA 21 Ribbon', 'Chaikin Money Flow'],
    bestAssetClasses: ['crypto', 'stocks', 'forex'],
    parameters: [
      { label: 'Fast EMA', value: 12, description: 'Zero-lag fast line period' },
      { label: 'Slow EMA', value: 26, description: 'Zero-lag slow line period' },
      { label: 'Signal Window', value: 9, description: 'Signal smoothing window' }
    ]
  }
];
