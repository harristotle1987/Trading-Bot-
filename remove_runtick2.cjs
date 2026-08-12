const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const regex = /const runTick = async \(\) => \{[\s\S]*?\}\s*if \(\!process\.env\.VERCEL\) \{\s*setInterval\(runTick, 3000\);\s*runTick\(\);\s*\}/;
content = content.replace(regex, '/* Removed local runTick interval */');
fs.writeFileSync('server.ts', content);
console.log('Done');
