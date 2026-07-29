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
      } catch(e) {
          console.error("Error fetching binance prices", e);
      }
      res.json(GLOBAL_PRICES);
  });
  
  app.get("/api/snapshots", (req, res) => {`;

content = content.replace(/  app\.get\("\/api\/market\/prices", async \(req, res\) => \{\n      res\.json\(GLOBAL_PRICES\);\n  \}\);\n  \n  app\.get\("\/api\/snapshots", \(req, res\) => \{/g, apiCode);
fs.writeFileSync('server.ts', content);
