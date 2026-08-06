const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

code = code.replace(/if \(\!admin\.apps \|\| \!admin\.apps\.length\)/, 'if (!admin.getApps().length)');

fs.writeFileSync('src/lib/firebase.ts', code);
