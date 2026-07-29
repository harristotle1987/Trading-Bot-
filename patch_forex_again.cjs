const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /const list = \[\];\s*const now = Math.floor\(Date.now\(\) \/ intervalMs\) \* intervalMs;\s*for \(let i = parsedLimit - 1; i >= 0; i--\) {\s*const time = now - \(i \* intervalMs\);\s*const open = currentPrice;\s*const high = currentPrice \+ \(Math.random\(\) \* 0.0010\);\s*const low = currentPrice - \(Math.random\(\) \* 0.0010\);\s*const close = low \+ \(Math.random\(\) \* \(high - low\)\);\s*currentPrice = close;\s*list.push\(\[time.toString\(\), open.toFixed\(5\), high.toFixed\(5\), low.toFixed\(5\), close.toFixed\(5\), "1000", "100000"\]\);\s*}\s*\/\/ Sort reverse chronologically as Bybit does\s*list.reverse\(\);/m;

const replacementForex = `          const list = [];
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

code = code.replace(regex, replacementForex);
fs.writeFileSync('server.ts', code);
