const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  'console.log("Bybit fetch failed, status:", response.status, "url:", url);',
  'if (response.status !== 403) console.log("Bybit fetch failed, status:", response.status, "url:", url);'
);

fs.writeFileSync('server.ts', code);
