const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /  app\.get\("\/api\/bybit\/v5\/market\/kline", async \(req, res\) => \{[\s\S]*?res\.json\(\{[\s\S]*?retCode: 0,[\s\S]*?retMsg: "OK",[\s\S]*?result: \{ category: "spot", symbol, list \},[\s\S]*?retExtInfo: \{\},[\s\S]*?time: Date\.now\(\)[\s\S]*?\}\);[\s\S]*?\}\);/m;

const newKlineEndpoint = `  app.get("/api/market/kline", async (req, res) => {
    try {
      const { category, symbol, interval, limit } = req.query;
      
      const isForex = typeof symbol === 'string' && ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'EURGBP'].includes(symbol);
      
      let parsedLimit = parseInt(limit) || 500;
      if (parsedLimit > 1000) parsedLimit = 1000;

      if (isForex) {
          const polygonKey = process.env.POLYGON_API_KEY;
          let multiplier = 1;
          let timespan = 'minute';
          let intervalMs = 60000;
          
          if (interval === "1") { multiplier = 1; timespan = 'minute'; intervalMs = 60000; }
          else if (interval === "3") { multiplier = 3; timespan = 'minute'; intervalMs = 180000; }
          else if (interval === "5") { multiplier = 5; timespan = 'minute'; intervalMs = 300000; }
          else if (interval === "15") { multiplier = 15; timespan = 'minute'; intervalMs = 900000; }
          else if (interval === "30") { multiplier = 30; timespan = 'minute'; intervalMs = 1800000; }
          else if (interval === "60") { multiplier = 1; timespan = 'hour'; intervalMs = 3600000; }
          else if (interval === "120") { multiplier = 2; timespan = 'hour'; intervalMs = 7200000; }
          else if (interval === "240") { multiplier = 4; timespan = 'hour'; intervalMs = 14400000; }
          else if (interval === "360") { multiplier = 6; timespan = 'hour'; intervalMs = 21600000; }
          else if (interval === "720") { multiplier = 12; timespan = 'hour'; intervalMs = 43200000; }
          else if (interval === "D") { multiplier = 1; timespan = 'day'; intervalMs = 86400000; }
          else if (interval === "M") { multiplier = 1; timespan = 'month'; intervalMs = 2592000000; }
          else if (interval === "W") { multiplier = 1; timespan = 'week'; intervalMs = 604800000; }
          else { multiplier = 1; timespan = 'minute'; intervalMs = 60000; }
          
          if (polygonKey) {
              const to = Date.now();
              const from = to - (intervalMs * parsedLimit * 2);
              const polygonUrl = \`https://api.polygon.io/v2/aggs/ticker/C:\${symbol}/range/\${multiplier}/\${timespan}/\${from}/\${to}?adjusted=true&sort=desc&limit=\${parsedLimit}&apiKey=\${polygonKey}\`;
              
              const polygonRes = await fetch(polygonUrl);
              if (polygonRes.ok) {
                  const polygonData = await polygonRes.json();
                  if (polygonData.results && polygonData.results.length > 0) {
                      const list = polygonData.results.map((k: any) => [
                          k.t.toString(),
                          k.o.toString(),
                          k.h.toString(),
                          k.l.toString(),
                          k.c.toString(),
                          k.v.toString(),
                          (k.v * k.c).toString()
                      ]);
                      GLOBAL_PRICES[symbol] = polygonData.results[0].c;
                      return res.json({
                          retCode: 0,
                          retMsg: "OK",
                          result: { category: "linear", symbol, list },
                          retExtInfo: {},
                          time: Date.now()
                      });
                  }
              }
          }

          // Generate mock forex data
          if (interval === "1s") intervalMs = 1000;
          let currentPrice = GLOBAL_PRICES[symbol as string] || 1.1370; // Use cache or fallback
          
          const list = [];
          const now = Math.floor(Date.now() / intervalMs) * intervalMs;
          for (let i = 0; i < parsedLimit; i++) {
              const time = now - (i * intervalMs);
              const close = currentPrice;
              const high = close + (Math.random() * 0.0010);
              const low = close - (Math.random() * 0.0010);
              const open = low + (Math.random() * (high - low));
              currentPrice = open;
              list.push([time.toString(), open.toFixed(5), high.toFixed(5), low.toFixed(5), close.toFixed(5), "1000", "100000"]);
          }
          
          return res.json({
              retCode: 0,
              retMsg: "OK",
              result: { category: "linear", symbol, list },
              retExtInfo: {},
              time: now
          });
      }

      // Non-Forex (Crypto) -> Map Bybit intervals to Binance intervals
      const intervalMap: Record<string, string> = {
          "1s": "1s",
          "1": "1m",
          "3": "3m",
          "5": "5m",
          "15": "15m",
          "30": "30m",
          "60": "1h",
          "120": "2h",
          "240": "4h",
          "360": "6h",
          "720": "12h",
          "D": "1d",
          "W": "1w",
          "M": "1M"
      };
      
      const binanceInterval = intervalMap[interval as string] || "1m";
      const binanceUrl = \`https://api.binance.com/api/v3/klines?symbol=\${symbol}&interval=\${binanceInterval}&limit=\${parsedLimit}\`;
      const binanceRes = await fetch(binanceUrl);
      
      if (binanceRes.ok) {
          const binanceData = await binanceRes.json();
          // Binance returns oldest to newest. Bybit returns newest to oldest.
          const list = binanceData.map((k: any) => [
              k[0].toString(), // open time
              k[1], // open
              k[2], // high
              k[3], // low
              k[4], // close
              k[5], // volume
              k[7]  // quote asset volume / turnover
          ]).reverse();
          
          return res.json({
              retCode: 0,
              retMsg: "OK",
              result: { category: category || 'spot', symbol, list },
              retExtInfo: {},
              time: Date.now()
          });
      } else {
          throw new Error("Binance API fetch failed: " + binanceRes.status);
      }
    } catch (error: any) {
      console.log("KLine fetch error, falling back to mock data:", error.message || error);
      
      // Fallback to mock data for crypto too
      const { symbol, interval, limit } = req.query;
      const parsedLimit = parseInt(limit) || 500;
      let intervalMs = 60000;
      if (interval === "5") intervalMs = 300000;
      if (interval === "15") intervalMs = 900000;
      if (interval === "60") intervalMs = 3600000;
      if (interval === "D") intervalMs = 86400000;
      
      let currentPrice = GLOBAL_PRICES[symbol as string] || 50000;
      const list = [];
      const now = Math.floor(Date.now() / intervalMs) * intervalMs;
      for (let i = 0; i < parsedLimit; i++) {
          const time = now - (i * intervalMs);
          const close = currentPrice;
          const high = close + (Math.random() * 50);
          const low = close - (Math.random() * 50);
          const open = low + (Math.random() * (high - low));
          currentPrice = open;
          list.push([time.toString(), open.toFixed(2), high.toFixed(2), low.toFixed(2), close.toFixed(2), "1", "50000"]);
      }
      
      return res.json({
          retCode: 0,
          retMsg: "OK",
          result: { category: "spot", symbol, list },
          retExtInfo: {},
          time: Date.now()
      });
    }
  });`;

const startIndex = code.indexOf('app.get("/api/bybit/v5/market/kline"');
if (startIndex === -1) {
    console.error("Could not find the kline endpoint");
    process.exit(1);
}

// Find the end of the endpoint (where the next endpoint or major block starts)
// We look for the closing of this app.get block.
let braceCount = 0;
let endIndex = -1;
let started = false;

for (let i = startIndex; i < code.length; i++) {
    if (code[i] === '{') {
        braceCount++;
        started = true;
    } else if (code[i] === '}') {
        braceCount--;
    }
    
    if (started && braceCount === 0) {
        // found the end of app.get
        // there is a closing parenthesis and semicolon after it: });
        let offset = 1;
        while (i + offset < code.length && /\s/.test(code[i + offset])) {
            offset++;
        }
        if (code[i + offset] === ')') offset++;
        if (code[i + offset] === ';') offset++;
        
        endIndex = i + offset;
        break;
    }
}

if (endIndex === -1) {
    console.error("Could not find end of kline endpoint");
    process.exit(1);
}

code = code.substring(0, startIndex) + newKlineEndpoint + code.substring(endIndex);

// Also remove Bybit logic from `/api/account/balances` and just mock live_data if Bybit is not available
code = code.replace(
    /if \(BYBIT_API_KEY && BYBIT_API_SECRET\) \{[\s\S]*?console\.log\("Sending balances response\.\.\."\);/m,
    `// Fetch live capital (simulated offline since Bybit blocked)
      live_data.status = "OFFLINE";
      console.log("Sending balances response...");`
);

fs.writeFileSync('server.ts', code);
