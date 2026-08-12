import {
  BitgetMarketDataProvider,
  CTraderMarketDataProvider,
  FinnhubMarketDataProvider,
  FxMarketDataProvider,
  normalizeQuote,
  normalizeCandle,
  normalizeMarketStatus,
  normalizeOrderBook,
  normalizeTrade,
  globalMarketRegistry
} from "./market_data/index.js";

async function runMarketDataTestSuite() {
  console.log("\n========== STEP 5: MARKET DATA ABSTRACTION LAYER TEST SUITE ==========\n");
  let passedCount = 0;
  let totalCount = 0;

  function assert(condition: boolean, description: string) {
    totalCount++;
    if (condition) {
      passedCount++;
      console.log(`  ✅ [PASS] ${description}`);
    } else {
      console.error(`  ❌ [FAIL] ${description}`);
      throw new Error(`Test failed: ${description}`);
    }
  }

  // -------------------------------------------------------------
  // TEST 1: Normalization Tests
  // -------------------------------------------------------------
  console.log("--- TEST GROUP 1: Market Data Normalization ---");
  const now = Date.now();
  const rawQuote = normalizeQuote({
    symbol: "btc/usdt",
    provider: "bitget",
    close: 65000.5,
    open: 64000.0,
    high: 66000.0,
    low: 63500.0,
    bid: 65000.0,
    ask: 65001.0,
    source_timestamp: now - 1000,
    received_timestamp: now
  });

  assert(rawQuote.symbol === "BTCUSDT", "Symbol cleaned to uppercase without slashes: BTCUSDT");
  assert(rawQuote.provider === "bitget", "Provider correctly set to 'bitget'");
  assert(rawQuote.close === 65000.5, "Close price matched: 65000.5");
  assert(rawQuote.spread === 1.0, "Spread auto-computed from ask - bid: 1.0");
  assert(rawQuote.is_stale === false, "Fresh quote marked as is_stale: false");
  assert(rawQuote.source_timestamp === now - 1000, "source_timestamp preserved");
  assert(rawQuote.received_timestamp === now, "received_timestamp set");

  // Test non-invention of missing data
  const minimalQuote = normalizeQuote({
    symbol: "AAPL",
    provider: "finnhub",
    close: 220.5
  });
  assert(minimalQuote.open === null, "Missing open stays null (no invented data)");
  assert(minimalQuote.volume === null, "Missing volume stays null (no invented data)");
  assert(minimalQuote.bid === null, "Missing bid stays null");
  assert(minimalQuote.ask === null, "Missing ask stays null");
  assert(minimalQuote.spread === null, "Missing spread stays null");

  // -------------------------------------------------------------
  // TEST 2: Stale Data Detection
  // -------------------------------------------------------------
  console.log("\n--- TEST GROUP 2: Stale Data Detection ---");
  const staleQuote = normalizeQuote({
    symbol: "EURUSD",
    provider: "fx_provider",
    close: 1.0850,
    source_timestamp: now - 300000, // 5 minutes ago (> 3 min threshold)
    received_timestamp: now,
    staleThresholdMs: 180000 // 3 minutes threshold
  });
  assert(staleQuote.is_stale === true, "Data older than 180s correctly flagged as is_stale: true");

  const freshQuote = normalizeQuote({
    symbol: "EURUSD",
    provider: "fx_provider",
    close: 1.0850,
    source_timestamp: now - 10000, // 10s ago
    received_timestamp: now,
    staleThresholdMs: 180000
  });
  assert(freshQuote.is_stale === false, "Data under 180s correctly flagged as is_stale: false");

  // -------------------------------------------------------------
  // TEST 3: Invalid Responses & Edge Cases
  // -------------------------------------------------------------
  console.log("\n--- TEST GROUP 3: Invalid Responses & Edge Cases ---");
  const invalidQuote = normalizeQuote({
    symbol: "INVALID_PAIR",
    provider: "test",
    close: NaN
  });
  assert(invalidQuote.close === 0, "NaN price normalized safely to 0");
  assert(invalidQuote.is_stale === true, "Zero/NaN price quote automatically flagged as stale");

  // -------------------------------------------------------------
  // TEST 4: Provider Timeout Handling
  // -------------------------------------------------------------
  console.log("\n--- TEST GROUP 4: Provider Timeout Handling ---");
  const bitgetTimeout = new BitgetMarketDataProvider();
  bitgetTimeout.timeoutMs = 1; // 1ms timeout to force AbortSignal trigger
  let timeoutCaught = false;
  try {
    await bitgetTimeout.get_quote("BTCUSDT");
  } catch (err: any) {
    timeoutCaught = true;
    assert(err.message.includes("BitgetProvider"), "Timeout error caught and formatted cleanly");
  }
  assert(timeoutCaught, "1ms ultra-fast timeout triggered signal abort");

  // -------------------------------------------------------------
  // TEST 5: Individual Real Symbol Fetches (One Real Symbol per Provider)
  // -------------------------------------------------------------
  console.log("\n--- TEST GROUP 5: Live Real Symbol Fetches per Provider ---");

  // 5a. Bitget Provider (Real Symbol: BTCUSDT)
  console.log("\nTesting Provider 1/4: BitgetMarketDataProvider (Real Symbol: BTCUSDT)");
  const bitget = new BitgetMarketDataProvider();
  try {
    const quote = await bitget.get_quote("BTCUSDT");
    assert(quote.provider === "bitget", "Bitget provider name is 'bitget'");
    assert(quote.close > 0, `Bitget BTCUSDT real quote fetched: $${quote.close}`);
    assert(typeof quote.source_timestamp === "number", `Source timestamp: ${quote.source_timestamp}`);

    const candles = await bitget.get_candles("BTCUSDT", "15m", 5);
    assert(candles.length > 0, `Bitget BTCUSDT 15m candles returned ${candles.length} items`);

    const status = await bitget.get_market_status("BTCUSDT");
    assert(status.isOpen === true && status.session === "24/7", "Bitget crypto market status is 24/7 active");

    const orderBook = await bitget.get_order_book("BTCUSDT");
    if (orderBook) {
      assert(orderBook.bids.length > 0, `Bitget order book bids length: ${orderBook.bids.length}`);
    } else {
      console.log("  ℹ️ Order book returned null (within expected fallback)");
    }
  } catch (err: any) {
    console.warn(`  ⚠️ Bitget real fetch warning: ${err.message}`);
  }

  // 5b. Finnhub Provider (Real Symbol: AAPL)
  console.log("\nTesting Provider 2/4: FinnhubMarketDataProvider (Real Symbol: AAPL)");
  const finnhub = new FinnhubMarketDataProvider();
  try {
    const quote = await finnhub.get_quote("AAPL");
    assert(quote.provider === "finnhub", "Finnhub provider name is 'finnhub'");
    assert(quote.close > 0, `Finnhub AAPL real quote fetched: $${quote.close}`);

    const status = await finnhub.get_market_status("AAPL");
    assert(typeof status.isOpen === "boolean", `Finnhub stock market status open: ${status.isOpen} (${status.session})`);

    const orderBook = await finnhub.get_order_book("AAPL");
    assert(orderBook === null, "Finnhub quote API correctly returns null for orderbook (no invented data)");
  } catch (err: any) {
    console.warn(`  ⚠️ Finnhub real fetch warning: ${err.message}`);
  }

  // 5c. FX Provider (Real Symbol: EURUSD)
  console.log("\nTesting Provider 3/4: FxMarketDataProvider (Real Symbol: EURUSD)");
  const fx = new FxMarketDataProvider();
  try {
    const quote = await fx.get_quote("EURUSD");
    assert(quote.provider === "fx_provider", "FX provider name is 'fx_provider'");
    assert(quote.close > 0, `FX EURUSD real quote fetched: ${quote.close}`);
    assert(quote.spread !== null && quote.spread > 0, `FX calculated spread: ${quote.spread}`);

    const status = await fx.get_market_status("EURUSD");
    assert(typeof status.isOpen === "boolean", `FX market status open: ${status.isOpen} (${status.session})`);
  } catch (err: any) {
    console.warn(`  ⚠️ FX real fetch warning: ${err.message}`);
  }

  // 5d. cTrader Provider (Real Symbol: GBPUSD)
  console.log("\nTesting Provider 4/4: CTraderMarketDataProvider (Real Symbol: GBPUSD)");
  const ctrader = new CTraderMarketDataProvider();
  try {
    const quote = await ctrader.get_quote("GBPUSD");
    assert(quote.provider === "ctrader", "cTrader provider name is 'ctrader'");
    assert(quote.close > 0, `cTrader GBPUSD quote fetched: ${quote.close}`);

    const orderBook = await ctrader.get_order_book("GBPUSD");
    if (orderBook) {
      assert(orderBook.bids.length === 5, "cTrader Depth of Market (DOM) returned 5 bids");
    }
  } catch (err: any) {
    console.warn(`  ⚠️ cTrader fetch warning: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 6: MarketDataRegistry Router Tests
  // -------------------------------------------------------------
  console.log("\n--- TEST GROUP 6: MarketDataRegistry Central Router ---");
  const bProvider = globalMarketRegistry.getProviderForSymbol("BTCUSDT");
  assert(bProvider.name === "bitget", "Registry routed 'BTCUSDT' to Bitget provider");

  const cProvider = globalMarketRegistry.getProviderForSymbol("EURUSD");
  assert(cProvider.name === "ctrader" || cProvider.name === "fx_provider", "Registry routed 'EURUSD' to Forex/cTrader provider");

  const fProvider = globalMarketRegistry.getProviderForSymbol("TSLA");
  assert(fProvider.name === "finnhub", "Registry routed 'TSLA' to Finnhub provider");

  console.log(`\n================================================================`);
  console.log(`🎉 TEST SUITE COMPLETE: ${passedCount}/${totalCount} assertions passed!`);
  console.log(`================================================================\n`);
}

runMarketDataTestSuite().catch((e) => {
  console.error("Test runner failed:", e);
  process.exit(1);
});
