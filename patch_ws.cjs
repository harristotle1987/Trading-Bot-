const fs = require('fs');
let code = fs.readFileSync('src/components/InteractiveChartsWorkspace.tsx', 'utf8');

const regex = /          const wsUrl = "wss:\/\/stream\.bybit\.com\/v5\/public\/linear";[\s\S]*?ws = new WebSocket\(wsUrl\);[\s\S]*?ws\.onopen = \(\) => \{[\s\S]*?ws\.send\(JSON\.stringify\(\{[\s\S]*?\}\)\);[\s\S]*?\};[\s\S]*?ws\.onmessage = \(event\) => \{[\s\S]*?try \{[\s\S]*?const msg = JSON\.parse\(event\.data\);[\s\S]*?if \(!msg\.data\) return;[\s\S]*?const kline = msg\.data\[0\];[\s\S]*?candlestickSeriesInstance\.update\(\{[\s\S]*?\}\);[\s\S]*?\} catch \(e\) \{[\s\S]*?\}[\s\S]*?\};/m;

const replacement = `
          let wsInterval = timeframe;
          if (timeframe === "1m") wsInterval = "1m";
          else if (timeframe === "5m") wsInterval = "5m";
          else if (timeframe === "15m") wsInterval = "15m";
          else if (timeframe === "1h") wsInterval = "1h";
          else if (timeframe === "4h") wsInterval = "4h";
          else if (timeframe === "6h") wsInterval = "6h";
          else if (timeframe === "12h") wsInterval = "12h";
          else if (timeframe === "1d") wsInterval = "1d";
          else wsInterval = "1m";

          const wsUrl = \`wss://stream.binance.com:9443/ws/\${selectedSymbol.toLowerCase()}@kline_\${wsInterval}\`;
          ws = new WebSocket(wsUrl);
          
          ws.onmessage = (event) => {
            try {
              const msg = JSON.parse(event.data);
              if (!msg.k) return;
              const kline = msg.k;
              
              if (isMounted) {
                candlestickSeriesInstance.update({
                  time: Math.floor(kline.t / 1000) as any,
                  open: parseFloat(kline.o),
                  high: parseFloat(kline.h),
                  low: parseFloat(kline.l),
                  close: parseFloat(kline.c)
                });
              }
            } catch (e) {
                // Ignore parse errors
            }
          };
`;

code = code.replace(regex, replacement.trim());
fs.writeFileSync('src/components/InteractiveChartsWorkspace.tsx', code);
