import { 
  QuantitativeFeatureEngine, 
  SimpleCandle, 
  calculateEMA, 
  calculateSMA, 
  calculateStdDev, 
  calculateRSI, 
  calculateATR, 
  calculateADX, 
  calculateMACD 
} from "./src/utils/featureEngine";

// =========================================================================
// TEST DATA GENERATORS
// =========================================================================

// 1. Generate normal upward-trending market data
function generateNormalData(count = 250): SimpleCandle[] {
  const candles: SimpleCandle[] = [];
  let price = 100.0;
  let baseVol = 10000;
  for (let i = 0; i < count; i++) {
    const change = (i % 10 === 0) ? -0.5 : 0.4; // steady upward drift
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + 0.2;
    const low = Math.min(open, close) - 0.2;
    const volume = baseVol + (i % 5) * 500;
    
    candles.push({
      timestamp: 1786400000000 + i * 15 * 60 * 1000,
      open,
      high,
      low,
      close,
      volume
    });
    price = close;
  }
  return candles;
}

// 2. Insufficient data
function generateInsufficientData(): SimpleCandle[] {
  return [
    { timestamp: 1786400000000, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 },
    { timestamp: 1786400900000, open: 100.5, high: 102, low: 100, close: 101.5, volume: 1200 }
  ];
}

// 3. Missing/Invalid/Null-polluted fields (cast as any to test runtime safety)
function generateMissingValuesData(): any[] {
  return [
    { timestamp: 1786400000000, open: 100, high: 102, low: 98, close: 101, volume: 1000 },
    null,
    { timestamp: 1786400900000, open: null, high: 103, low: 99, close: 102, volume: 1100 },
    { timestamp: 1786401800000, open: 102, high: 104, low: 101, close: undefined, volume: 1200 },
    { timestamp: 1786402700000, open: 102, high: 105, low: 100, close: 104, volume: 1300 }
  ];
}

// 4. NaN values
function generateNaNData(): SimpleCandle[] {
  const data = generateNormalData(30);
  data[15].close = NaN;
  data[15].open = NaN;
  data[15].high = NaN;
  data[15].low = NaN;
  return data;
}

// 5. Zero Volume
function generateZeroVolumeData(): SimpleCandle[] {
  const candles = generateNormalData(30);
  candles.forEach(c => {
    c.volume = 0;
  });
  return candles;
}

// 6. Flat Market
function generateFlatMarketData(): SimpleCandle[] {
  const candles: SimpleCandle[] = [];
  for (let i = 0; i < 50; i++) {
    candles.push({
      timestamp: 1786400000000 + i * 15 * 60 * 1000,
      open: 100.0,
      high: 100.0,
      low: 100.0,
      close: 100.0,
      volume: 5000
    });
  }
  return candles;
}

// =========================================================================
// RUN TEST SUITE
// =========================================================================

async function runTests() {
  console.log("============================================================");
  console.log("       STARTING CENTRALIZED QUANTITATIVE FEATURE TESTS       ");
  console.log("============================================================\n");

  let passedAll = true;

  const runTest = (name: string, fn: () => boolean) => {
    try {
      const ok = fn();
      if (ok) {
        console.log(`[PASS] ${name}`);
      } else {
        console.log(`[FAIL] ${name}`);
        passedAll = false;
      }
    } catch (e: any) {
      console.log(`[FAIL] ${name} (Crashed with error: ${e.message})`);
      passedAll = false;
    }
  };

  // -------------------------------------------------------------------------
  // Test 1: Normal Data & Precision Calculations
  // -------------------------------------------------------------------------
  runTest("Indicator Math & FeatureSet with Normal Data", () => {
    const normal = generateNormalData(250);
    const features = QuantitativeFeatureEngine.generateFeatures({
      symbol: "BTCUSDT",
      primaryCandles: normal,
      primaryTimeframe: "15m"
    });

    // Check typings and metadata
    const meta = features.metadata;
    if (meta.symbol !== "BTCUSDT" || meta.primaryTimeframe !== "15m" || meta.candleCount !== 250 || meta.isFallback) {
      console.log("Failed metadata verification:", meta);
      return false;
    }

    // Verify indicators calculated successfully (non-null)
    const { trend, momentum, volatility, structure, volume, multiTimeframe } = features;
    
    // EMA checks
    if (trend.ema20 === null || trend.ema50 === null || trend.ema100 === null || trend.ema200 === null) {
      console.log("Trend EMAs failed to calculate:", trend);
      return false;
    }

    // Since our normal dataset has steady upward drift:
    // EMA20 > EMA50 > EMA100 > EMA200 should hold true
    if (!trend.isBullishEMAStack) {
      console.log("Trend isBullishEMAStack check failed. Stack values:", {
        ema20: trend.ema20,
        ema50: trend.ema50,
        ema100: trend.ema100,
        ema200: trend.ema200
      });
      return false;
    }

    if (trend.ema20_slope === null || trend.ema20_slope <= 0) {
      console.log("EMA slope check failed:", trend.ema20_slope);
      return false;
    }

    // RSI check
    if (momentum.rsi === null || momentum.rsi < 0 || momentum.rsi > 100) {
      console.log("RSI failed or outside limits [0,100]:", momentum.rsi);
      return false;
    }

    // MACD checks
    if (momentum.macdLine === null || momentum.signalLine === null || momentum.macdHistogram === null) {
      console.log("MACD calculations failed:", momentum);
      return false;
    }

    // ADX verification
    if (trend.adx === null || trend.plusDI === null || trend.minusDI === null) {
      console.log("ADX calculation failed:", trend);
      return false;
    }

    // Volatility Verification
    if (volatility.atr === null || volatility.atr <= 0 || volatility.bbWidth === null || volatility.bbWidth <= 0) {
      console.log("Volatility indicators (ATR/BB) failed or zero:", volatility);
      return false;
    }

    // Price Structure & Candle checks
    if (structure.candleBody === 0 || structure.range === 0 || structure.swingHigh === null || structure.swingLow === null) {
      console.log("Structure metrics failed:", structure);
      return false;
    }

    // Multi-timeframe trend evaluation
    if (multiTimeframe.primaryTimeframeTrend !== "bullish") {
      console.log("Primary timeframe trend should be bullish but was:", multiTimeframe.primaryTimeframeTrend);
      return false;
    }

    return true;
  });

  // -------------------------------------------------------------------------
  // Test 2: Insufficient Data (Returns clean fallback structure)
  // -------------------------------------------------------------------------
  runTest("Graceful Handling of Insufficient Data (2 candles)", () => {
    const shortData = generateInsufficientData();
    const features = QuantitativeFeatureEngine.generateFeatures({
      symbol: "BTCUSDT",
      primaryCandles: shortData,
      primaryTimeframe: "15m"
    });

    if (!features.metadata.isFallback) {
      console.log("Metadata.isFallback should be true for 2 candles");
      return false;
    }

    // Large window indicators should return null
    if (features.trend.ema20 !== null || features.trend.ema200 !== null) {
      console.log("EMA20/EMA200 should be null with only 2 candles:", features.trend);
      return false;
    }

    if (features.momentum.rsi !== null || features.volatility.atr !== null) {
      console.log("RSI and ATR should be null with 2 candles");
      return false;
    }

    // However, price structure for the individual last candle must still work!
    if (features.structure.candleBody <= 0 || features.structure.range <= 0) {
      console.log("Individual candle structure must calculate correctly:", features.structure);
      return false;
    }

    return true;
  });

  // -------------------------------------------------------------------------
  // Test 3: Missing/Null/Malformed Candle Records
  // -------------------------------------------------------------------------
  runTest("Resilience to Missing & Null Values in Input Streams", () => {
    const messyData = generateMissingValuesData();
    const features = QuantitativeFeatureEngine.generateFeatures({
      symbol: "ETHUSDT",
      primaryCandles: messyData,
      primaryTimeframe: "15m"
    });

    // Messy data has 5 items but 2 are malformed or null. Should cleanly filter out and process valid ones.
    if (features.metadata.candleCount !== 3) {
      console.log("Engine failed to correctly filter out malformed candles. Count:", features.metadata.candleCount);
      return false;
    }

    // Validate that metadata calculates correctly
    if (features.metadata.symbol !== "ETHUSDT" || !features.metadata.isFallback) {
      return false;
    }

    return true;
  });

  // -------------------------------------------------------------------------
  // Test 4: NaN Handling and Safety
  // -------------------------------------------------------------------------
  runTest("Sanitizing and Avoiding NaN Downstream Poisoning", () => {
    const nanData = generateNaNData();
    const features = QuantitativeFeatureEngine.generateFeatures({
      symbol: "SOLUSDT",
      primaryCandles: nanData,
      primaryTimeframe: "15m"
    });

    // Should gracefully filter out the NaN candle at index 15
    if (features.metadata.candleCount !== 29) {
      console.log("NaN candles were not filtered successfully. Count:", features.metadata.candleCount);
      return false;
    }

    // Verify indicator values aren't NaN
    if (isNaN(features.trend.ema20 || 0) || isNaN(features.momentum.rsi || 0)) {
      console.log("Downstream features poisoned with NaN values:", features);
      return false;
    }

    return true;
  });

  // -------------------------------------------------------------------------
  // Test 5: Zero Volume Market State
  // -------------------------------------------------------------------------
  runTest("Zero Volume Calculations (Safe from division by zero)", () => {
    const zeroVolData = generateZeroVolumeData();
    const features = QuantitativeFeatureEngine.generateFeatures({
      symbol: "ADAUSDT",
      primaryCandles: zeroVolData,
      primaryTimeframe: "15m"
    });

    const { volume } = features;
    // relative volume should be handled cleanly, e.g., null or 0, not Infinity or NaN
    if (volume.relativeVolume === Infinity || (volume.relativeVolume !== null && isNaN(volume.relativeVolume))) {
      console.log("Relative volume failed zero volume safety check:", volume.relativeVolume);
      return false;
    }

    if (volume.volumeChange === Infinity || (volume.volumeChange !== null && isNaN(volume.volumeChange))) {
      console.log("Volume change failed zero volume safety check:", volume.volumeChange);
      return false;
    }

    return true;
  });

  // -------------------------------------------------------------------------
  // Test 6: Flat Market (Price = Constant)
  // -------------------------------------------------------------------------
  runTest("Flat Market Calculations (Safe from division by zero in RSI/Volatility)", () => {
    const flatData = generateFlatMarketData();
    const features = QuantitativeFeatureEngine.generateFeatures({
      symbol: "USDTUSD",
      primaryCandles: flatData,
      primaryTimeframe: "15m"
    });

    const { momentum, volatility, trend } = features;

    // RSI should handle flat gains and losses gracefully (return 50 or stable value, never NaN/Infinity)
    if (momentum.rsi === null || isNaN(momentum.rsi) || !isFinite(momentum.rsi)) {
      console.log("Flat market RSI failed:", momentum.rsi);
      return false;
    }

    // Bollinger Band width should handle stdDev = 0 gracefully (return 0 or near 0)
    if (volatility.bbWidth === null || isNaN(volatility.bbWidth) || !isFinite(volatility.bbWidth) || volatility.bbWidth !== 0) {
      console.log("Flat market BB Width failed. Got:", volatility.bbWidth);
      return false;
    }

    // ADX should handle flat range gracefully
    if (isNaN(trend.adx || 0) || !isFinite(trend.adx || 0)) {
      console.log("Flat market ADX calculation failed:", trend.adx);
      return false;
    }

    return true;
  });

  console.log("\n============================================================");
  if (passedAll) {
    console.log("🎉 ALL STEP 7 UNIT TESTS COMPLETED SUCCESSFULLY AND PASSED!");
  } else {
    console.log("❌ SOME TESTS FAILED. PLEASE VERIFY CALCULATIONS.");
    process.exit(1);
  }
  console.log("============================================================");
}

runTests();
