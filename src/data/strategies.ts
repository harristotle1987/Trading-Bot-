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
  { id: '30m', label: '30 Minutes', durationMs: 30 * 60 * 1000, category: 'Medium' },
  { id: '1h', label: '1 Hour', durationMs: 60 * 60 * 1000, category: 'Intraday' },
  { id: '4h', label: '4 Hours', durationMs: 4 * 60 * 60 * 1000, category: 'Swing' },
  { id: '1d', label: '1 Day', durationMs: 24 * 60 * 60 * 1000, category: 'Macro' },
  { id: '1w', label: '1 Week', durationMs: 7 * 24 * 60 * 60 * 1000, category: 'Macro' }
];

export const TRADING_STRATEGIES: StrategyConfig[] = [
  {
    id: 'day-trading',
    name: 'Day Trading (VWAP & Intraday Momentum)',
    tagline: 'Captures institutional intraday volume pushes and session breakouts',
    category: 'Day Trading',
    description: 'Scans for session VWAP retests combined with 50/200 EMA golden/death crosses. Optimal for capturing clean directional moves during London & New York market overlaps.',
    recommendedTimeframe: '1h',
    allowedTimeframes: ['30m', '1h', '4h'],
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
    allowedTimeframes: ['4h', '1d', '1w'],
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
    name: 'Intraday Breakout (H1/H4 Trend Rider)',
    tagline: 'Captures precise 30m and 1h structural breakouts and trend continuations',
    category: 'Scalping',
    description: 'Transitioned from micro-scalping to high-precision structural breakout detection. Monitors key session boundaries and average true range (ATR) expansions on H1 and H4 candles.',
    recommendedTimeframe: '30m',
    allowedTimeframes: ['30m', '1h'],
    defaultWinRate: 91.5,
    payoutRange: '90% - 98%',
    riskLevel: 'MEDIUM',
    indicators: ['Stochastic (14,3,3) Cross', '8/21 EMA Trend Lines', 'ATR Breakout Range', 'Volume Expansion Filter'],
    bestAssetClasses: ['forex', 'crypto'],
    parameters: [
      { label: 'Stoch %K', value: 14, description: 'Smoothed stochastic momentum window' },
      { label: 'ATR Period', value: 14, description: 'Average True Range multiplier for breakout sizing' },
      { label: 'Volume Ratio', value: '1.5x Base', description: 'Minimum volume threshold to confirm breakout' }
    ]
  },
  {
    id: 'martingale-trend',
    name: 'Smart Money Concepts (SMC Liquidity Engine)',
    tagline: 'High-accuracy institutional order block trading with multi-timeframe confirmations',
    category: 'Price Action',
    description: 'Replacing high-risk martingale multipliers with rigorous institutional Smart Money Concepts (SMC). Scans for Liquidity Sweeps, Change of Character (CHoCH), and Fair Value Gaps (FVG) with strict multi-timeframe risk filters.',
    recommendedTimeframe: '4h',
    allowedTimeframes: ['30m', '1h', '4h', '1d'],
    defaultWinRate: 96.1,
    payoutRange: '88% - 95%',
    riskLevel: 'LOW',
    indicators: ['Institutional Order Block', 'Change of Character (CHoCH)', 'Liquidity Sweep Indicator', 'Displacement FVG Zone'],
    bestAssetClasses: ['forex', 'crypto', 'commodities'],
    parameters: [
      { label: 'Market Structure', value: 'H4 Align', description: 'Macro trend alignment filter' },
      { label: 'Min FVG Distance', value: '12 Pips', description: 'Minimum fair value gap clearance' },
      { label: 'Confluence Count', value: '4+ Factors', description: 'Number of strict checklist rules satisfied' }
    ]
  },
  {
    id: 'price-action',
    name: 'Price Action & Pin Bar (Pure Structure)',
    tagline: 'Pure candlestick geometry, rejection tails, and Fair Value Gaps (FVG)',
    category: 'Price Action',
    description: 'No lag, purely structural price patterns. Detects long rejection wicks at supply/demand zones, bullish/bearish engulfing bars, and Fair Value Gap imbalances.',
    recommendedTimeframe: '4h',
    allowedTimeframes: ['30m', '1h', '4h', '1d'],
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
    recommendedTimeframe: '1h',
    allowedTimeframes: ['30m', '1h', '4h'],
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
    recommendedTimeframe: '30m',
    allowedTimeframes: ['30m', '1h', '4h'],
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
