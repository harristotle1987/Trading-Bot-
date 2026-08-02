const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const bybitCode = `
          // Crypto from Bybit
          const bybitRes = await fetch("https://api.bybit.com/v5/market/tickers?category=linear");
          if (!bybitRes.ok) {
              console.error("Bybit fetch failed:", bybitRes.statusText);
              // Fallback to Binance
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
                  }
              } catch (e) {
                  console.warn("Binance fallback failed", e);
              }
          } else {
`;

code = code.replace(`
          // Crypto from Bybit
          const bybitRes = await fetch("https://api.bybit.com/v5/market/tickers?category=linear");
          if (!bybitRes.ok) {
              console.error("Bybit fetch failed:", bybitRes.statusText);
          } else {
`, bybitCode.trim() + '\n');

fs.writeFileSync('server.ts', code);
