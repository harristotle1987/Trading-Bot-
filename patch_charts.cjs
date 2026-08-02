const fs = require('fs');
let code = fs.readFileSync('src/components/InteractiveChartsWorkspace.tsx', 'utf8');

code = code.replace(/const categoryParam = isForex \? 'linear' : 'spot';/g, 'const category = TRADABLE_PAIRS.find((p: any) => p.symbol === selectedSymbol)?.category || "crypto";\n        const categoryParam = category;');
code = code.replace(/if \(!isForex && timeframe === "1s"\) \{/g, 'const category = TRADABLE_PAIRS.find((p: any) => p.symbol === selectedSymbol)?.category || "crypto";\n      if (category === "crypto" && timeframe === "1s") {');
code = code.replace(/else if \(isForex\) \{/g, 'else if (category === "forex" || category === "stocks") {');
code = code.replace(/} else \{\n          \/\/ Connect directly to Bybit WebSocket/g, '} else {\n          // Connect directly to Binance WebSocket');

fs.writeFileSync('src/components/InteractiveChartsWorkspace.tsx', code);
