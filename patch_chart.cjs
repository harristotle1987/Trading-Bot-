const fs = require('fs');
let code = fs.readFileSync('src/components/InteractiveChartsWorkspace.tsx', 'utf8');

const targetForexWS = `      } else if (isForex && timeframe === "1s") {
          // Simulate 1s WebSocket for Forex since Bybit doesn't support it
          let currentPrice = 1.1000;
          if (selectedSymbol === 'GBPUSD') currentPrice = 1.2500;
          if (selectedSymbol === 'USDJPY') currentPrice = 150.00;
          
          let lastCandleTime = Math.floor(Date.now() / 1000);
          
          const intervalId = setInterval(() => {
              if (!isMounted) {
                  clearInterval(intervalId);
                  return;
              }
              const now = Math.floor(Date.now() / 1000);
              const open = currentPrice;
              const high = currentPrice + (Math.random() * 0.0001);
              const low = currentPrice - (Math.random() * 0.0001);
              const close = low + (Math.random() * (high - low));
              currentPrice = close;
              
              candlestickSeriesInstance.update({
                  time: now as any,
                  open,
                  high,
                  low,
                  close
              });
          }, 1000);
          
          // @ts-ignore
          ws = { close: () => clearInterval(intervalId) } as any;
          
      } else {
          // Connect directly to Bybit WebSocket
          const wsUrl = isForex ? "wss://stream.bybit.com/v5/public/linear" : "wss://stream.bybit.com/v5/public/spot";`;

const replacementForexWS = `      } else if (isForex) {
          // Bybit doesn't support forex, so we poll our own server for updates
          let currentPrice = 1.0;
          let lastCandleTime = Math.floor(Date.now() / 1000);
          
          let intervalMs = 60000;
          if (timeframe === "1s") intervalMs = 1000;
          if (timeframe === "1m") intervalMs = 60000;
          if (timeframe === "5m") intervalMs = 300000;
          if (timeframe === "15m") intervalMs = 900000;
          if (timeframe === "1h") intervalMs = 3600000;
          if (timeframe === "4h") intervalMs = 14400000;
          
          let currentOpen = 0;
          let currentHigh = 0;
          let currentLow = Number.MAX_VALUE;
          
          const updateInterval = setInterval(async () => {
              if (!isMounted) return clearInterval(updateInterval);
              try {
                  const res = await fetch('/api/market/prices');
                  if (!res.ok) return;
                  const data = await res.json();
                  if (data[selectedSymbol]) {
                      const newPrice = data[selectedSymbol];
                      
                      const nowMs = Date.now();
                      const candleTime = Math.floor(nowMs / intervalMs) * intervalMs;
                      const timeInSeconds = Math.floor(candleTime / 1000);
                      
                      if (timeInSeconds !== lastCandleTime) {
                          // New candle
                          lastCandleTime = timeInSeconds;
                          currentOpen = newPrice;
                          currentHigh = newPrice;
                          currentLow = newPrice;
                      } else {
                          // Update current candle
                          if (currentOpen === 0) currentOpen = newPrice;
                          currentHigh = Math.max(currentHigh, newPrice);
                          currentLow = Math.min(currentLow, newPrice);
                      }
                      
                      candlestickSeriesInstance.update({
                          time: timeInSeconds as any,
                          open: currentOpen,
                          high: currentHigh,
                          low: currentLow,
                          close: newPrice
                      });
                  }
              } catch (e) {
                  // ignore
              }
          }, 3000); // poll every 3s
          
          // @ts-ignore
          ws = { close: () => clearInterval(updateInterval) } as any;
          
      } else {
          // Connect directly to Bybit WebSocket
          const wsUrl = "wss://stream.bybit.com/v5/public/spot";`;

code = code.replace(targetForexWS, replacementForexWS);
fs.writeFileSync('src/components/InteractiveChartsWorkspace.tsx', code);
