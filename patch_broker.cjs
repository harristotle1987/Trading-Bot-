const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(/broker: "BYBIT"/g, 'broker: "BINANCE"');
fs.writeFileSync('server.ts', code);
