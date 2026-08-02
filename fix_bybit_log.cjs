const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  'console.error("Bybit fetch failed:", bybitRes.statusText);',
  'if (bybitRes.status !== 403) console.warn("Bybit fetch failed:", bybitRes.statusText);'
);

fs.writeFileSync('server.ts', code);
