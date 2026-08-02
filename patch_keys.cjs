const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// For GET /api/config/keys
code = code.replace(
    'bybit: !!(process.env.BYBIT_API_KEY && process.env.BYBIT_API_SECRET)',
    'bybit: false'
);

// For POST /api/config/keys
code = code.replace(
    'const { nvidia, bybit_key, bybit_secret, polygon, finnhub, ctrader_client_id, ctrader_client_secret, ctrader_access_token } = req.body;',
    'const { nvidia, polygon, finnhub, ctrader_client_id, ctrader_client_secret, ctrader_access_token } = req.body;'
);
code = code.replace(
    'if (bybit_key) process.env.BYBIT_API_KEY = bybit_key;',
    ''
);
code = code.replace(
    'if (bybit_secret) process.env.BYBIT_API_SECRET = bybit_secret;',
    ''
);

fs.writeFileSync('server.ts', code);
