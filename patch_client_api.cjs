const fs = require('fs');
let code = fs.readFileSync('src/components/InteractiveChartsWorkspace.tsx', 'utf8');

code = code.replace(
  '/api/bybit/v5/market/kline',
  '/api/market/kline'
);

fs.writeFileSync('src/components/InteractiveChartsWorkspace.tsx', code);
