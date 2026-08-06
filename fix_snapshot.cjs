const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/\.onSnapshot\(snap\) => \{/g, '.onSnapshot((snap) => {');
fs.writeFileSync('server.ts', code);
