const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  'const binanceRes = await fetch("https://api.binance.com/api/v3/ticker/price");',
  'const binanceRes = await fetch("https://api.binance.com/api/v3/ticker/price", { signal: AbortSignal.timeout(4000) });'
);

code = code.replace(
  'const finnhubRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=OANDA:${s}&token=${process.env.FINNHUB_API_KEY}`);',
  'const finnhubRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=OANDA:${s}&token=${process.env.FINNHUB_API_KEY}`, { signal: AbortSignal.timeout(3000) });'
);

code = code.replace(
  'const polygonRes = await fetch(`https://api.polygon.io/v2/aggs/ticker/${s}/prev?adjusted=true&apiKey=${process.env.POLYGON_API_KEY}`);',
  'const polygonRes = await fetch(`https://api.polygon.io/v2/aggs/ticker/${s}/prev?adjusted=true&apiKey=${process.env.POLYGON_API_KEY}`, { signal: AbortSignal.timeout(3000) });'
);

fs.writeFileSync('server.ts', code);
