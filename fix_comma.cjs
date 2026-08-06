const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/\.onSnapshot, \(/g, '.onSnapshot(');
fs.writeFileSync('server.ts', code);
