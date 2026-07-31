const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetForex = `          // Generate mock forex data
          if (interval === "1s") intervalMs = 1000;
          
          let currentPrice = GLOBAL_PRICES[symbol as string] || 1.1370; // Use cache or fallback
          
          const list = [];
          const now = Math.floor(Date.now() / intervalMs) * intervalMs;
          for (let i = parsedLimit - 1; i >= 0; i--) {
              const time = now - (i * intervalMs);
              const open = currentPrice;
              const high = currentPrice + (Math.random() * 0.0010);
              const low = currentPrice - (Math.random() * 0.0010);
              const close = low + (Math.random() * (high - low));
              currentPrice = close;
              list.push([time.toString(), open.toFixed(5), high.toFixed(5), low.toFixed(5), close.toFixed(5), "1000", "100000"]);
          }
          // Sort reverse chronologically as Bybit does
          list.reverse();`;

const replacementForex = `          // Generate mock forex data
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
          }`;

code = code.replace(targetForex, replacementForex);

const targetCrypto = `      let currentPrice = 65000.00;
      if (typeof symbol === 'string') {
          if (symbol.includes("ETH")) currentPrice = 3500.00;
          if (symbol.includes("SOL")) currentPrice = 140.00;
      }
      
      const list = [];
      const now = Math.floor(Date.now() / intervalMs) * intervalMs;
      for (let i = parsedLimit - 1; i >= 0; i--) {
          const time = now - (i * intervalMs);
          const open = currentPrice;
          const high = currentPrice + (Math.random() * currentPrice * 0.001);
          const low = currentPrice - (Math.random() * currentPrice * 0.001);
          const close = low + (Math.random() * (high - low));
          currentPrice = close;
          list.push([time.toString(), open.toFixed(2), high.toFixed(2), low.toFixed(2), close.toFixed(2), "100", "1000000"]);
      }
      list.reverse();`;

const replacementCrypto = `      let currentPrice = GLOBAL_PRICES[symbol as string] || 65000.00;
      if (typeof symbol === 'string' && !GLOBAL_PRICES[symbol as string]) {
          if (symbol.includes("ETH")) currentPrice = 3500.00;
          if (symbol.includes("SOL")) currentPrice = 140.00;
      }
      
      const list = [];
      const now = Math.floor(Date.now() / intervalMs) * intervalMs;
      for (let i = 0; i < parsedLimit; i++) {
          const time = now - (i * intervalMs);
          const close = currentPrice;
          const high = close + (Math.random() * close * 0.001);
          const low = close - (Math.random() * close * 0.001);
          const open = low + (Math.random() * (high - low));
          currentPrice = open;
          list.push([time.toString(), open.toFixed(2), high.toFixed(2), low.toFixed(2), close.toFixed(2), "100", "1000000"]);
      }`;

code = code.replace(targetCrypto, replacementCrypto);
fs.writeFileSync('server.ts', code);
