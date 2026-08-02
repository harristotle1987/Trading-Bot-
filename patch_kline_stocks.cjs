const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const replacement = `
      if (isForex || category === 'stocks') {
          let finnhubSymbol = symbol;
          if (isForex) {
              finnhubSymbol = \`OANDA:\${symbol.substring(0,3)}_\${symbol.substring(3)}\`;
          }
          const polygonKey = process.env.POLYGON_API_KEY;
          const finnhubKey = process.env.FINNHUB_API_KEY;
`;

code = code.replace(/      if \(isForex\) \{[\s\S]*?const polygonKey = process\.env\.POLYGON_API_KEY;/m, replacement.trim());

const replacement2 = `
          // Try Finnhub for Stocks & Forex Klines
          if (finnhubKey) {
              let finnhubReso = '1';
              if (interval === "1") finnhubReso = '1';
              else if (interval === "5") finnhubReso = '5';
              else if (interval === "15") finnhubReso = '15';
              else if (interval === "30") finnhubReso = '30';
              else if (interval === "60") finnhubReso = '60';
              else if (interval === "D") finnhubReso = 'D';
              else if (interval === "W") finnhubReso = 'W';
              else if (interval === "M") finnhubReso = 'M';
              
              const to = Math.floor(Date.now() / 1000);
              const from = to - (intervalMs / 1000 * parsedLimit);
              
              const finnhubUrl = \`https://finnhub.io/api/v1/stock/candle?symbol=\${finnhubSymbol}&resolution=\${finnhubReso}&from=\${from}&to=\${to}&token=\${finnhubKey}\`;
              const finnRes = await fetch(finnhubUrl);
              if (finnRes.ok) {
                  const data = await finnRes.json();
                  if (data.s === 'ok' && data.t && data.t.length > 0) {
                      const list = data.t.map((t: number, i: number) => [
                          (t * 1000).toString(),
                          data.o[i].toString(),
                          data.h[i].toString(),
                          data.l[i].toString(),
                          data.c[i].toString(),
                          data.v[i].toString(),
                          "1"
                      ]).reverse();
                      GLOBAL_PRICES[symbol] = data.c[data.c.length - 1];
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
          
          if (polygonKey && isForex) {
`;

code = code.replace(/          if \(polygonKey\) \{/m, replacement2.trim());

fs.writeFileSync('server.ts', code);
