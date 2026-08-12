const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// The runTick function and interval
const runTickRegex = /const runTick = async \(\) => \{[\s\S]*?\}\n\s*if \(\!process\.env\.VERCEL\) \{\n\s*setInterval\(runTick, 3000\);\n\s*runTick\(\);\n\s*\}/;

content = content.replace(runTickRegex, '/* Removed local runTick interval for stateless architecture */');
fs.writeFileSync('server.ts', content);
console.log('Removed runTick');
