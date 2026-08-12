export interface FeatureSetMetadata {
  symbol: string;
  primaryTimeframe: string;
  calculatedAt: number;
  candleCount: number;
  isFallback: boolean;
}

export interface FeatureSet {
  // Metadata for audit/reproduction
  metadata: FeatureSetMetadata;

  // Trend Features
  trend: {
    ema20: number | null;
    ema50: number | null;
    ema100: number | null;
    ema200: number | null;
    ema20_slope: number | null; // change over last 3 periods
    ema50_slope: number | null;
    adx: number | null;
    plusDI: number | null;
    minusDI: number | null;
    isBullishEMAStack: boolean; // 20 > 50 > 100 > 200
  };

  // Momentum Features
  momentum: {
    rsi: number | null;
    macdLine: number | null;
    signalLine: number | null;
    macdHistogram: number | null;
    roc: number | null; // Rate of change over 12 periods
  };

  // Volatility Features
  volatility: {
    atr: number | null;
    atrPercent: number | null; // ATR as % of close
    bbWidth: number | null;    // (Upper - Lower) / Middle
    bbUpper: number | null;
    bbLower: number | null;
    bbMiddle: number | null;
    historicalVolatility: number | null; // StdDev of log returns over 20 periods
  };

  // Price Structure Features
  structure: {
    candleBody: number;
    upperWick: number;
    lowerWick: number;
    range: number;
    swingHigh: number | null;
    swingLow: number | null;
    distanceToSupport: number | null;    // relative distance (e.g. (price - support)/price)
    distanceToResistance: number | null; // relative distance (e.g. (resistance - price)/price)
  };

  // Volume Features
  volume: {
    volumeChange: number | null;       // (Vol_t - Vol_t-1) / Vol_t-1
    relativeVolume: number | null;     // Vol_t / SMA_Vol(20)
    volumeAcceleration: number | null; // rate of change of volume change
  };

  // Multi-Timeframe Features
  multiTimeframe: {
    higherTimeframeTrend: "bullish" | "bearish" | "neutral";      // e.g. 1h
    primaryTimeframeTrend: "bullish" | "bearish" | "neutral";     // e.g. 15m
    confirmationTimeframeTrend: "bullish" | "bearish" | "neutral";// e.g. 5m
  };
}

export interface SimpleCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// =========================================================================
// HELPER MATH UTILITIES (Handles NaNs, infinities, empty states)
// =========================================================================

function safeDiv(num: number, den: number, fallback = 0): number {
  if (isNaN(num) || isNaN(den) || den === 0) return fallback;
  const result = num / den;
  return isFinite(result) ? result : fallback;
}

function cleanNumber(val: any, fallback = 0): number {
  if (val === null || val === undefined || isNaN(Number(val))) return fallback;
  return Number(val);
}

export function calculateSMA(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  if (values.length < period) {
    return Array(values.length).fill(null);
  }

  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    const val = cleanNumber(values[i]);
    sum += val;
    if (i < period - 1) {
      result.push(null);
    } else {
      if (i >= period) {
        sum -= cleanNumber(values[i - period]);
      }
      result.push(sum / period);
    }
  }
  return result;
}

export function calculateEMA(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  if (values.length === 0) return [];
  if (values.length < period) {
    return Array(values.length).fill(null);
  }

  const k = 2 / (period + 1);
  
  // Seed with SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += cleanNumber(values[i]);
  }
  const seedSMA = sum / period;

  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      result.push(seedSMA);
    } else {
      const prevEMA = result[i - 1]!;
      const currentVal = cleanNumber(values[i]);
      const currentEMA = currentVal * k + prevEMA * (1 - k);
      result.push(currentEMA);
    }
  }
  return result;
}

// Standard Deviation
export function calculateStdDev(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  if (values.length < period) {
    return Array(values.length).fill(null);
  }

  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }

    const window = values.slice(i - period + 1, i + 1).map(v => cleanNumber(v));
    const mean = window.reduce((a, b) => a + b, 0) / period;
    const sqDiffSum = window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
    const variance = sqDiffSum / period;
    result.push(Math.sqrt(variance));
  }
  return result;
}

// =========================================================================
// QUANTITATIVE INDICATOR CALCULATIONS
// =========================================================================

// Slope calculation (linear regression slope or simple endpoint delta)
export function calculateSlope(emaValues: (number | null)[], lookback = 3): number | null {
  const len = emaValues.length;
  if (len < lookback + 1) return null;
  const current = emaValues[len - 1];
  const past = emaValues[len - 1 - lookback];
  if (current === null || past === null || past === 0) return null;
  return (current - past) / past; // returns relative slope
}

// RSI (Relative Strength Index)
export function calculateRSI(candles: SimpleCandle[], period = 14): (number | null)[] {
  const len = candles.length;
  if (len < period + 1) {
    return Array(len).fill(null);
  }

  const result: (number | null)[] = Array(len).fill(null);
  
  let gainsSum = 0;
  let lossesSum = 0;

  // First values to initialize averages
  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff > 0) gainsSum += diff;
    else lossesSum -= diff;
  }

  let avgGain = gainsSum / period;
  let avgLoss = lossesSum / period;

  if (avgLoss === 0) {
    result[period] = avgGain === 0 ? 50 : 100;
  } else {
    result[period] = 100 - 100 / (1 + avgGain / avgLoss);
  }

  for (let i = period + 1; i < len; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      result[i] = avgGain === 0 ? 50 : 100;
    } else {
      result[i] = 100 - 100 / (1 + avgGain / avgLoss);
    }
  }

  return result;
}

// ATR (Average True Range)
export function calculateATR(candles: SimpleCandle[], period = 14): (number | null)[] {
  const len = candles.length;
  if (len === 0) return [];
  const trueRanges: number[] = [candles[0].high - candles[0].low];

  for (let i = 1; i < len; i++) {
    const h_l = candles[i].high - candles[i].low;
    const h_pc = Math.abs(candles[i].high - candles[i - 1].close);
    const l_pc = Math.abs(candles[i].low - candles[i - 1].close);
    trueRanges.push(Math.max(h_l, h_pc, l_pc));
  }

  if (trueRanges.length < period) {
    return Array(len).fill(null);
  }

  const result: (number | null)[] = Array(len).fill(null);
  
  // Seed TR with standard average
  let trSum = 0;
  for (let i = 0; i < period; i++) {
    trSum += trueRanges[i];
  }
  let currentATR = trSum / period;
  result[period - 1] = currentATR;

  for (let i = period; i < len; i++) {
    currentATR = (currentATR * (period - 1) + trueRanges[i]) / period;
    result[i] = currentATR;
  }

  return result;
}

// ADX (Average Directional Index)
export interface ADXResult {
  adx: (number | null)[];
  plusDI: (number | null)[];
  minusDI: (number | null)[];
}

export function calculateADX(candles: SimpleCandle[], period = 14): ADXResult {
  const len = candles.length;
  const empty: ADXResult = {
    adx: Array(len).fill(null),
    plusDI: Array(len).fill(null),
    minusDI: Array(len).fill(null)
  };

  if (len < period * 2) return empty;

  const tr: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];

  // Index 0 has no prev candle
  tr.push(candles[0].high - candles[0].low);
  plusDM.push(0);
  minusDM.push(0);

  for (let i = 1; i < len; i++) {
    const c = candles[i];
    const p = candles[i - 1];

    // True Range
    const h_l = c.high - c.low;
    const h_pc = Math.abs(c.high - p.close);
    const l_pc = Math.abs(c.low - p.close);
    tr.push(Math.max(h_l, h_pc, l_pc));

    // Directional Movement
    const upMove = c.high - p.high;
    const downMove = p.low - c.low;

    if (upMove > downMove && upMove > 0) {
      plusDM.push(upMove);
    } else {
      plusDM.push(0);
    }

    if (downMove > upMove && downMove > 0) {
      minusDM.push(downMove);
    } else {
      minusDM.push(0);
    }
  }

  const smoothedTR: number[] = Array(len).fill(0);
  const smoothedPlusDM: number[] = Array(len).fill(0);
  const smoothedMinusDM: number[] = Array(len).fill(0);

  let trSum = 0;
  let plusDMSum = 0;
  let minusDMSum = 0;

  for (let i = 0; i < period; i++) {
    trSum += tr[i];
    plusDMSum += plusDM[i];
    minusDMSum += minusDM[i];
  }

  smoothedTR[period - 1] = trSum;
  smoothedPlusDM[period - 1] = plusDMSum;
  smoothedMinusDM[period - 1] = minusDMSum;

  for (let i = period; i < len; i++) {
    smoothedTR[i] = smoothedTR[i - 1] - (smoothedTR[i - 1] / period) + tr[i];
    smoothedPlusDM[i] = smoothedPlusDM[i - 1] - (smoothedPlusDM[i - 1] / period) + plusDM[i];
    smoothedMinusDM[i] = smoothedMinusDM[i - 1] - (smoothedMinusDM[i - 1] / period) + minusDM[i];
  }

  const plusDI: (number | null)[] = Array(len).fill(null);
  const minusDI: (number | null)[] = Array(len).fill(null);
  const dx: number[] = Array(len).fill(0);

  for (let i = period - 1; i < len; i++) {
    const trVal = smoothedTR[i];
    const pDM = smoothedPlusDM[i];
    const mDM = smoothedMinusDM[i];

    if (trVal === 0) {
      plusDI[i] = 0;
      minusDI[i] = 0;
    } else {
      plusDI[i] = (pDM / trVal) * 100;
      minusDI[i] = (mDM / trVal) * 100;
    }

    const diSum = (plusDI[i] || 0) + (minusDI[i] || 0);
    const diDiff = Math.abs((plusDI[i] || 0) - (minusDI[i] || 0));
    dx[i] = diSum === 0 ? 0 : (diDiff / diSum) * 100;
  }

  const adx: (number | null)[] = Array(len).fill(null);
  let dxSum = 0;
  for (let i = period - 1; i < period * 2 - 1; i++) {
    dxSum += dx[i];
  }
  let currentADX = dxSum / period;
  adx[period * 2 - 2] = currentADX;

  for (let i = period * 2 - 1; i < len; i++) {
    currentADX = (currentADX * (period - 1) + dx[i]) / period;
    adx[i] = currentADX;
  }

  return { adx, plusDI, minusDI };
}

// MACD (Moving Average Convergence Divergence)
export interface MACDResult {
  macdLine: (number | null)[];
  signalLine: (number | null)[];
  macdHistogram: (number | null)[];
}

export function calculateMACD(
  closes: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MACDResult {
  const len = closes.length;
  const empty: MACDResult = {
    macdLine: Array(len).fill(null),
    signalLine: Array(len).fill(null),
    macdHistogram: Array(len).fill(null)
  };

  if (len < slowPeriod) return empty;

  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);

  const macdLine: (number | null)[] = [];
  for (let i = 0; i < len; i++) {
    const f = fastEMA[i];
    const s = slowEMA[i];
    if (f !== null && s !== null) {
      macdLine.push(f - s);
    } else {
      macdLine.push(null);
    }
  }

  // Filter non-null values to calculate signal line EMA
  const validMacdIdx = macdLine.findIndex((v) => v !== null);
  if (validMacdIdx === -1 || len - validMacdIdx < signalPeriod) {
    return empty;
  }

  const validMacd = macdLine.slice(validMacdIdx) as number[];
  const validSignal = calculateEMA(validMacd, signalPeriod);

  const signalLine: (number | null)[] = Array(validMacdIdx).fill(null).concat(validSignal);
  const macdHistogram: (number | null)[] = [];

  for (let i = 0; i < len; i++) {
    const m = macdLine[i];
    const s = signalLine[i];
    if (m !== null && s !== null) {
      macdHistogram.push(m - s);
    } else {
      macdHistogram.push(null);
    }
  }

  return { macdLine, signalLine, macdHistogram };
}

// Historical Volatility (StdDev of daily log returns, annualized or simple time-scaled)
export function calculateHistoricalVolatility(closes: number[], period = 20): (number | null)[] {
  const len = closes.length;
  if (len < period + 1) {
    return Array(len).fill(null);
  }

  const logReturns: number[] = [];
  for (let i = 1; i < len; i++) {
    const current = closes[i];
    const prev = closes[i - 1];
    if (current <= 0 || prev <= 0) {
      logReturns.push(0);
    } else {
      logReturns.push(Math.log(current / prev));
    }
  }

  const stdDevs = calculateStdDev(logReturns, period);
  // Re-align with the original closes array (prepend null for index 0 of closes)
  return [null].concat(stdDevs);
}

// Swing High / Swing Low detector (local extrema)
export function findSwingHigh(candles: SimpleCandle[], lookback = 5): number | null {
  const len = candles.length;
  if (len < lookback * 2 + 1) return null;

  // Let's look for the highest high in the last 20 candles that qualifies as a swing
  for (let i = len - 1 - lookback; i >= lookback; i--) {
    const currentHigh = candles[i].high;
    let isSwing = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && candles[j].high > currentHigh) {
        isSwing = false;
        break;
      }
    }
    if (isSwing) return currentHigh;
  }
  // Fallback: simple max high
  return Math.max(...candles.slice(Math.max(0, len - 20)).map(c => c.high));
}

export function findSwingLow(candles: SimpleCandle[], lookback = 5): number | null {
  const len = candles.length;
  if (len < lookback * 2 + 1) return null;

  for (let i = len - 1 - lookback; i >= lookback; i--) {
    const currentLow = candles[i].low;
    let isSwing = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && candles[j].low < currentLow) {
        isSwing = false;
        break;
      }
    }
    if (isSwing) return currentLow;
  }
  return Math.min(...candles.slice(Math.max(0, len - 20)).map(c => c.low));
}

// =========================================================================
// CENTRALIZED FEATURE ENGINE
// =========================================================================

export class QuantitativeFeatureEngine {
  /**
   * Generates a fully normalized, deterministic FeatureSet object from candle streams.
   */
  static generateFeatures(params: {
    symbol: string;
    primaryCandles: SimpleCandle[]; // e.g. 15m
    higherCandles?: SimpleCandle[];  // e.g. 1h (optional)
    lowerCandles?: SimpleCandle[];   // e.g. 5m (optional)
    primaryTimeframe?: string;
  }): FeatureSet {
    const symbol = params.symbol || "UNKNOWN";
    const primaryTimeframe = params.primaryTimeframe || "15m";
    const rawCandles = params.primaryCandles || [];
    const now = Date.now();

    // Sanitize candles to eliminate NaNs, infinities, empty items
    const candles = rawCandles
      .filter((c) => c && typeof c.close === "number" && !isNaN(c.close))
      .map((c) => ({
        timestamp: cleanNumber(c.timestamp),
        open: cleanNumber(c.open),
        high: cleanNumber(c.high),
        low: cleanNumber(c.low),
        close: cleanNumber(c.close),
        volume: cleanNumber(c.volume)
      }));

    const count = candles.length;
    const isFallback = count < 20;

    // Default structure if data is empty or completely invalid
    const emptyMetadata: FeatureSetMetadata = {
      symbol,
      primaryTimeframe,
      calculatedAt: now,
      candleCount: count,
      isFallback: true
    };

    if (count === 0) {
      return this.createEmptyFeatureSet(emptyMetadata);
    }

    const lastCandle = candles[count - 1];
    const prevCandle = count > 1 ? candles[count - 2] : lastCandle;
    const prevPrevCandle = count > 2 ? candles[count - 3] : prevCandle;

    const closes = candles.map((c) => c.close);
    const volumes = candles.map((c) => c.volume);

    // 1. Calculate EMAs
    const ema20Arr = calculateEMA(closes, 20);
    const ema50Arr = calculateEMA(closes, 50);
    const ema100Arr = calculateEMA(closes, 100);
    const ema200Arr = calculateEMA(closes, 200);

    const ema20 = ema20Arr[count - 1] ?? null;
    const ema50 = ema50Arr[count - 1] ?? null;
    const ema100 = ema100Arr[count - 1] ?? null;
    const ema200 = ema200Arr[count - 1] ?? null;

    const ema20_slope = calculateSlope(ema20Arr, 3);
    const ema50_slope = calculateSlope(ema50Arr, 3);

    const isBullishEMAStack =
      ema20 !== null &&
      ema50 !== null &&
      ema100 !== null &&
      ema200 !== null &&
      ema20 > ema50 &&
      ema50 > ema100 &&
      ema100 > ema200;

    // 2. ADX
    const adxResult = calculateADX(candles, 14);
    const adx = adxResult.adx[count - 1] ?? null;
    const plusDI = adxResult.plusDI[count - 1] ?? null;
    const minusDI = adxResult.minusDI[count - 1] ?? null;

    // 3. RSI
    const rsiArr = calculateRSI(candles, 14);
    const rsi = rsiArr[count - 1] ?? null;

    // 4. MACD
    const macdResult = calculateMACD(closes, 12, 26, 9);
    const macdLine = macdResult.macdLine[count - 1] ?? null;
    const signalLine = macdResult.signalLine[count - 1] ?? null;
    const macdHistogram = macdResult.macdHistogram[count - 1] ?? null;

    // 5. ROC (Rate of Change, 12 periods)
    let roc: number | null = null;
    if (count > 12) {
      const pastClose = closes[count - 13];
      if (pastClose > 0) {
        roc = ((lastCandle.close - pastClose) / pastClose) * 100;
      }
    }

    // 6. ATR
    const atrArr = calculateATR(candles, 14);
    const atr = atrArr[count - 1] ?? null;
    const atrPercent = atr !== null && lastCandle.close > 0 ? (atr / lastCandle.close) * 100 : null;

    // 7. Bollinger Bands (20, 2)
    const sma20Arr = calculateSMA(closes, 20);
    const stdDev20Arr = calculateStdDev(closes, 20);
    const bbMiddle = sma20Arr[count - 1] ?? null;
    const stdDev20 = stdDev20Arr[count - 1] ?? null;

    let bbUpper: number | null = null;
    let bbLower: number | null = null;
    let bbWidth: number | null = null;

    if (bbMiddle !== null && stdDev20 !== null) {
      bbUpper = bbMiddle + 2 * stdDev20;
      bbLower = bbMiddle - 2 * stdDev20;
      bbWidth = bbMiddle === 0 ? 0 : (bbUpper - bbLower) / bbMiddle;
    }

    // 8. Historical Volatility
    const hvArr = calculateHistoricalVolatility(closes, 20);
    const historicalVolatility = hvArr[count - 1] ?? null;

    // 9. Candle Body & Wicks
    const candleBody = Math.abs(lastCandle.close - lastCandle.open);
    const range = lastCandle.high - lastCandle.low;
    let upperWick = 0;
    let lowerWick = 0;

    if (lastCandle.close >= lastCandle.open) {
      upperWick = lastCandle.high - lastCandle.close;
      lowerWick = lastCandle.open - lastCandle.low;
    } else {
      upperWick = lastCandle.high - lastCandle.open;
      lowerWick = lastCandle.close - lastCandle.low;
    }

    // 10. Swing High / Low & Distance to Support/Resistance
    const swingHigh = findSwingHigh(candles, 5);
    const swingLow = findSwingLow(candles, 5);

    let distanceToSupport: number | null = null;
    let distanceToResistance: number | null = null;

    if (swingLow !== null && lastCandle.close > 0) {
      distanceToSupport = (lastCandle.close - swingLow) / lastCandle.close;
    }
    if (swingHigh !== null && lastCandle.close > 0) {
      distanceToResistance = (swingHigh - lastCandle.close) / lastCandle.close;
    }

    // 11. Volume calculations
    let volumeChange: number | null = null;
    if (prevCandle.volume > 0) {
      volumeChange = (lastCandle.volume - prevCandle.volume) / prevCandle.volume;
    }

    const volSMA20Arr = calculateSMA(volumes, 20);
    const volSMA20 = volSMA20Arr[count - 1] ?? null;
    const relativeVolume = volSMA20 !== null && volSMA20 > 0 ? lastCandle.volume / volSMA20 : null;

    let volumeAcceleration: number | null = null;
    if (prevPrevCandle && prevPrevCandle.volume > 0) {
      const currentChange = lastCandle.volume - prevCandle.volume;
      const pastChange = prevCandle.volume - prevPrevCandle.volume;
      volumeAcceleration = currentChange - pastChange;
    }

    // 12. Multi-Timeframe Trend Analysis
    const primaryTimeframeTrend = this.evaluateTrendDirection(candles);
    const higherTimeframeTrend = params.higherCandles ? this.evaluateTrendDirection(params.higherCandles) : "neutral";
    const confirmationTimeframeTrend = params.lowerCandles ? this.evaluateTrendDirection(params.lowerCandles) : "neutral";

    return {
      metadata: {
        symbol,
        primaryTimeframe,
        calculatedAt: now,
        candleCount: count,
        isFallback
      },
      trend: {
        ema20,
        ema50,
        ema100,
        ema200,
        ema20_slope,
        ema50_slope,
        adx,
        plusDI,
        minusDI,
        isBullishEMAStack
      },
      momentum: {
        rsi,
        macdLine,
        signalLine,
        macdHistogram,
        roc
      },
      volatility: {
        atr,
        atrPercent,
        bbWidth,
        bbUpper,
        bbLower,
        bbMiddle,
        historicalVolatility
      },
      structure: {
        candleBody,
        upperWick,
        lowerWick,
        range,
        swingHigh,
        swingLow,
        distanceToSupport,
        distanceToResistance
      },
      volume: {
        volumeChange,
        relativeVolume,
        volumeAcceleration
      },
      multiTimeframe: {
        higherTimeframeTrend,
        primaryTimeframeTrend,
        confirmationTimeframeTrend
      }
    };
  }

  public static FEATURE_VERSION = "v2.0-quant";

  /**
   * Authoritative ML feature vector extractor (P1-5).
   * Schema (16 elements):
   * 0: normalized RSI (-1 to 1)
   * 1: normalized ADX (0 to 1)
   * 2: DI spread (plusDI - minusDI) / 100
   * 3: normalized MACD histogram
   * 4: ROC / 100
   * 5: ATR percent / 100
   * 6: Bollinger width
   * 7: Historical volatility / 100
   * 8: Relative volume
   * 9: Volume change
   * 10: EMA20 slope
   * 11: EMA stack flag (1.0 or 0.0)
   * 12: Distance to support
   * 13: Distance to resistance
   * 14: Strategy agreement ratio
   * 15: Regime code (1.0 bull, -1.0 bear, 0.0 other)
   */
  public static extractMLFeatureVector(
    fs: FeatureSet,
    agreementRatio: number = 0.5,
    regimeCode: number = 0.0
  ): number[] {
    const rsiNorm = fs.momentum.rsi !== null ? (fs.momentum.rsi - 50) / 50 : 0.0;
    const adxNorm = fs.trend.adx !== null ? fs.trend.adx / 100 : 0.0;
    const diDiff = (fs.trend.plusDI !== null && fs.trend.minusDI !== null) ? (fs.trend.plusDI - fs.trend.minusDI) / 100 : 0.0;
    const macdHist = fs.momentum.macdHistogram !== null ? fs.momentum.macdHistogram : 0.0;
    const rocVal = fs.momentum.roc !== null ? fs.momentum.roc / 100 : 0.0;
    const atrPct = fs.volatility.atrPercent !== null ? fs.volatility.atrPercent / 100 : 0.0;
    const bbW = fs.volatility.bbWidth !== null ? fs.volatility.bbWidth : 0.0;
    const histVol = fs.volatility.historicalVolatility !== null ? fs.volatility.historicalVolatility / 100 : 0.0;
    const relVol = fs.volume.relativeVolume !== null ? fs.volume.relativeVolume : 1.0;
    const volChg = fs.volume.volumeChange !== null ? fs.volume.volumeChange : 0.0;
    const emaSlope = fs.trend.ema20_slope !== null ? fs.trend.ema20_slope : 0.0;
    const emaStack = fs.trend.isBullishEMAStack ? 1.0 : 0.0;
    const distSup = fs.structure.distanceToSupport !== null ? fs.structure.distanceToSupport : 0.0;
    const distRes = fs.structure.distanceToResistance !== null ? fs.structure.distanceToResistance : 0.0;

    return [
      rsiNorm,
      adxNorm,
      diDiff,
      macdHist,
      rocVal,
      atrPct,
      bbW,
      histVol,
      relVol,
      volChg,
      emaSlope,
      emaStack,
      distSup,
      distRes,
      agreementRatio,
      regimeCode
    ];
  }

  private static evaluateTrendDirection(candles: SimpleCandle[]): "bullish" | "bearish" | "neutral" {
    if (candles.length < 20) return "neutral";
    const closes = candles.map((c) => c.close);
    const ema20Arr = calculateEMA(closes, 20);
    const ema20 = ema20Arr[ema20Arr.length - 1];
    const lastClose = closes[closes.length - 1];

    if (ema20 === null) return "neutral";
    if (lastClose > ema20 * 1.001) return "bullish";
    if (lastClose < ema20 * 0.999) return "bearish";
    return "neutral";
  }

  private static createEmptyFeatureSet(metadata: FeatureSetMetadata): FeatureSet {
    return {
      metadata,
      trend: {
        ema20: null,
        ema50: null,
        ema100: null,
        ema200: null,
        ema20_slope: null,
        ema50_slope: null,
        adx: null,
        plusDI: null,
        minusDI: null,
        isBullishEMAStack: false
      },
      momentum: {
        rsi: null,
        macdLine: null,
        signalLine: null,
        macdHistogram: null,
        roc: null
      },
      volatility: {
        atr: null,
        atrPercent: null,
        bbWidth: null,
        bbUpper: null,
        bbLower: null,
        bbMiddle: null,
        historicalVolatility: null
      },
      structure: {
        candleBody: 0,
        upperWick: 0,
        lowerWick: 0,
        range: 0,
        swingHigh: null,
        swingLow: null,
        distanceToSupport: null,
        distanceToResistance: null
      },
      volume: {
        volumeChange: null,
        relativeVolume: null,
        volumeAcceleration: null
      },
      multiTimeframe: {
        higherTimeframeTrend: "neutral",
        primaryTimeframeTrend: "neutral",
        confirmationTimeframeTrend: "neutral"
      }
    };
  }
}
