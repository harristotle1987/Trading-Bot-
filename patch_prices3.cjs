const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const apiCode = `
  app.get("/api/market/prices", async (req, res) => {
      try {
          const binanceRes = await fetch("https://api.binance.com/api/v3/ticker/price");
          if (binanceRes.ok) {
              const binanceData = await binanceRes.json();
              binanceData.forEach(item => {
                  GLOBAL_PRICES[item.symbol] = parseFloat(item.price);
              });
          }
          
          const polygonKey = process.env.POLYGON_API_KEY;
          if (polygonKey) {
              const polygonRes = await fetch("https://api.polygon.io/v2/snapshot/locale/global/markets/forex/tickers?apiKey=" + polygonKey);
              if (polygonRes.ok) {
                  const polygonData = await polygonRes.json();
                  if (polygonData.tickers) {
                      polygonData.tickers.forEach(t => {
                          const sym = t.ticker.replace('C:', '');
                          GLOBAL_PRICES[sym] = t.min.c;
                      });
                  }
              }
          }
      } catch(e) {
          console.error("Error fetching prices", e);
      }
      res.json(GLOBAL_PRICES);
  });
  
  app.get("/api/snapshots", (req, res) => {`;

content = content.replace(/  app\.get\("\/api\/market\/prices", async \(req, res\) => \{\n[\s\S]*?      res\.json\(GLOBAL_PRICES\);\n  \}\);\n  \n  app\.get\("\/api\/snapshots", \(req, res\) => \{/g, apiCode);
fs.writeFileSync('server.ts', content);
