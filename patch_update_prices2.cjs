const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const replacement = `
          // Crypto & Forex from Finnhub if available
          if (process.env.FINNHUB_API_KEY) {
              // Finnhub Crypto
              for (const s of cryptoSymbols) {
                  try {
                      const finnhubRes = await fetch(\`https://finnhub.io/api/v1/quote?symbol=BINANCE:\${s}&token=\${process.env.FINNHUB_API_KEY}\`);
                      if (finnhubRes.ok) {
                          const data = await finnhubRes.json();
                          if (data && data.c) GLOBAL_PRICES[s] = data.c;
                      }
                      await new Promise(r => setTimeout(r, 35)); // avoid rate limit (30 API calls/sec for free tier)
                  } catch (e) {
                      console.warn(\`Finnhub fetch failed for \${s}\`);
                  }
              }
              // Finnhub Forex
              for (const s of forexSymbols) {
                  try {
                      const finnhubSymbol = \`OANDA:\${s.substring(0,3)}_\${s.substring(3)}\`;
                      const finnhubRes = await fetch(\`https://finnhub.io/api/v1/quote?symbol=\${finnhubSymbol}&token=\${process.env.FINNHUB_API_KEY}\`);
                      if (finnhubRes.ok) {
                          const data = await finnhubRes.json();
                          if (data && data.c && data.c !== 0) GLOBAL_PRICES[s] = data.c;
                      }
                      await new Promise(r => setTimeout(r, 35));
                  } catch (e) {
                      console.warn(\`Finnhub fetch failed for \${s}\`);
                  }
              }
          } else {
              // Fallback to Binance for Crypto
              try {
                  const binanceRes = await fetch("https://api.binance.com/api/v3/ticker/price");
                  if (binanceRes.ok) {
                      const binanceData = await binanceRes.json();
                      for (const s of cryptoSymbols) {
                          const ticker = binanceData.find((t: any) => t.symbol === s);
                          if (ticker) GLOBAL_PRICES[s] = parseFloat(ticker.price);
                      }
                  }
              } catch (e) {
                  console.warn("Binance fallback failed", e);
              }
          }

          // Forex from Polygon as secondary fallback
          const forexFallbacks: Record<string, number> = {
            "EURUSD": 1.0850, "GBPUSD": 1.2850, "USDJPY": 150.00, "AUDUSD": 0.6700,
            "USDCAD": 1.3600, "USDCHF": 0.9200, "NZDUSD": 0.6100, "EURGBP": 0.8400,
            "EURJPY": 160.00, "GBPJPY": 185.00, "AUDJPY": 95.00, "EURAUD": 1.6500,
            "GBPCAD": 1.7500, "CADJPY": 105.00, "CHFJPY": 170.00
          };
          
          if (process.env.CTRADER_CLIENT_ID && process.env.CTRADER_CLIENT_SECRET) {
              for (const s of forexSymbols) {
                  if (!GLOBAL_PRICES[s]) GLOBAL_PRICES[s] = forexFallbacks[s] || 1.0;
              }
          } else if (!process.env.FINNHUB_API_KEY && process.env.POLYGON_API_KEY) {
`;

code = code.replace(/          \/\/ Crypto from Binance instead of Bybit[\s\S]*?\} else if \(process\.env\.POLYGON_API_KEY\) \{/m, replacement.trim() + ' } else if (process.env.POLYGON_API_KEY) {');

fs.writeFileSync('server.ts', code);
