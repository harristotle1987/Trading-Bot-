const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
    'checkService("Exchange API (Bybit)", false, 120 + Math.random() * 100),',
    'checkService("Exchange API (Binance)", false, 120 + Math.random() * 100),'
);

fs.writeFileSync('server.ts', code);
