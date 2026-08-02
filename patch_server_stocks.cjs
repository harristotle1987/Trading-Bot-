const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const replacement = `const forexSymbols = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "USDCHF", "NZDUSD", "EURGBP", "EURJPY", "GBPJPY", "AUDJPY", "EURAUD", "GBPCAD", "CADJPY", "CHFJPY"];
      const stockSymbols = ["AAPL", "MSFT", "TSLA", "AMZN", "GOOGL", "NVDA", "META"];`;

code = code.replace(/const forexSymbols = \["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "USDCHF", "NZDUSD", "EURGBP", "EURJPY", "GBPJPY", "AUDJPY", "EURAUD", "GBPCAD", "CADJPY", "CHFJPY"\];/, replacement);

const replacement2 = `              // Finnhub Stocks
              for (const s of stockSymbols) {
                  try {
                      const finnhubRes = await fetch(\`https://finnhub.io/api/v1/quote?symbol=\${s}&token=\${process.env.FINNHUB_API_KEY}\`);
                      if (finnhubRes.ok) {
                          const data = await finnhubRes.json();
                          if (data && data.c && data.c !== 0) GLOBAL_PRICES[s] = data.c;
                      }
                      await new Promise(r => setTimeout(r, 35));
                  } catch (e) {
                      console.warn(\`Finnhub fetch failed for \${s}\`);
                  }
              }`;
              
code = code.replace(/\/\/ Finnhub Forex\n              for \(const s of forexSymbols\) \{[\s\S]*?await new Promise\(r => setTimeout\(r, 35\)\);\n                  \} catch \(e\) \{\n                      console\.warn\(\`Finnhub fetch failed for \$\{s\}\`\);\n                  \}\n              \}/m, `// Finnhub Forex
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
${replacement2}
`);

fs.writeFileSync('server.ts', code);
