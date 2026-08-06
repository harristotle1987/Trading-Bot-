const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  'const finnhubRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${finnhubSymbol}&token=${process.env.FINNHUB_API_KEY}`);',
  'const finnhubRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${finnhubSymbol}&token=${process.env.FINNHUB_API_KEY}`, { signal: AbortSignal.timeout(3000) });'
);
code = code.replace(
  'const finnhubRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${s}&token=${process.env.FINNHUB_API_KEY}`);',
  'const finnhubRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${s}&token=${process.env.FINNHUB_API_KEY}`, { signal: AbortSignal.timeout(3000) });'
);

fs.writeFileSync('server.ts', code);
