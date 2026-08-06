const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Remove the setTimeout delay at the start of runAutoTrade
code = code.replace(/const delay = Math\.floor\(Math\.random\(\) \* \(60000 - 5000 \+ 1\)\ \+\ 5000\);\s*console\.log\(\`Auto-trading: Searching for trades \(delay: \$\{delay\}ms\)\`\);\s*if \(!process\.env\.VERCEL\) await new Promise\(resolve => setTimeout\(resolve, delay\)\);/, 'console.log(`Auto-trading: Searching for trades`);');

// Remove the self-scheduling setTimeout at the end
code = code.replace(/if \(!process\.env\.VERCEL\) setTimeout\(runAutoTrade, 5000\); \/\/ Wait 5s before next loop/g, '');

// Remove the initial call to runAutoTrade
code = code.replace(/if \(!process\.env\.VERCEL\) runAutoTrade\(\);/g, '');

// In runAutoTrade, inside the loop where it skips if tradeAmount > liveBalance:
code = code.replace(/if \(!process\.env\.VERCEL\) setTimeout\(runAutoTrade, 5000\);/g, '');

fs.writeFileSync('server.ts', code);
