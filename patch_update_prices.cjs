const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const newUpdatePrices = `  const updatePrices = async () => {
      const cryptoSymbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "BNBUSDT", "ADAUSDT", "DOGEUSDT", "AVAXUSDT", "LINKUSDT", "DOTUSDT", "NEARUSDT", "SUIUSDT", "APTUSDT", "MATICUSDT", "LTCUSDT", "UNIUSDT", "ATOMUSDT", "ETCUSDT", "FILUSDT", "ARBUSDT"];
      const forexSymbols = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "USDCHF", "NZDUSD", "EURGBP", "EURJPY", "GBPJPY", "AUDJPY", "EURAUD", "GBPCAD", "CADJPY", "CHFJPY"];
      
      try {
          // Crypto from Binance instead of Bybit (Vercel IP blocked by Bybit)
          try {
              const binanceRes = await fetch("https://api.binance.com/api/v3/ticker/price");
              if (binanceRes.ok) {
                  const binanceData = await binanceRes.json();
                  for (const s of cryptoSymbols) {
                      const ticker = binanceData.find((t: any) => t.symbol === s);
                      if (ticker) {
                          GLOBAL_PRICES[s] = parseFloat(ticker.price);
                      }
                  }
              } else if (process.env.FINNHUB_API_KEY) {
                  // Fallback to Finnhub if Binance fails
                  for (const s of cryptoSymbols) {
                      const finnhubRes = await fetch(\`https://finnhub.io/api/v1/quote?symbol=BINANCE:\${s}&token=\${process.env.FINNHUB_API_KEY}\`);
                      if (finnhubRes.ok) {
                          const data = await finnhubRes.json();
                          if (data && data.c) {
                              GLOBAL_PRICES[s] = data.c;
                          }
                      }
                      // Wait a bit to avoid rate limits
                      await new Promise(r => setTimeout(r, 50));
                  }
              }
          } catch (e) {
              console.warn("Crypto fetch failed", e);
          }
`;

const regex = /  const updatePrices = async \(\) => \{[\s\S]*?catch \(e\) \{\n                  console\.warn\("Binance fallback failed", e\);\n              \}\n          \} else \{\n              const bybitData = await bybitRes\.json\(\);\n              const tickers = bybitData\.result\?\.list \|\| \[\];\n              \n              for \(const s of cryptoSymbols\) \{\n                  const ticker = tickers\.find\(\(t: any\) => t\.symbol === s\);\n                  if \(ticker\) \{\n                      GLOBAL_PRICES\[s\] = parseFloat\(ticker\.lastPrice\);\n                  \} else \{\n                      console\.warn\(\`Bybit ticker not found for \$\{s\}\`\);\n                  \}\n              \}\n          \}/g;

code = code.replace(regex, newUpdatePrices.trim());
fs.writeFileSync('server.ts', code);
