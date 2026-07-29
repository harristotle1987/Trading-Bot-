const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Replace constant DEMO_ACCOUNT_STATE definition
code = code.replace(/const DEMO_ACCOUNT_STATE = {[\s\S]*?equity: 10000\.00,[\s\S]*?open_positions: GLOBAL_POSITIONS[\s\S]*?};/, '');

// And then dynamically build it in the route
code = code.replace('res.json(DEMO_ACCOUNT_STATE);', 'res.json({ balance: demoBalance, currency: "USDT", equity: demoBalance, open_positions: GLOBAL_POSITIONS });');

fs.writeFileSync('server.ts', code);
