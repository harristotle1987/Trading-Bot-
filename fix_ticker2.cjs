const fs = require('fs');
let content = fs.readFileSync('src/components/MarketTicker.tsx', 'utf8');

content = content.replace(
/prices\[p\.symbol\] \? \(p\.category === 'crypto' \? `\$` \+ prices\[p\.symbol\]\.toLocaleString[^)]+\) : prices\[p\.symbol\]\.toFixed\(5\)\) : "---"/g,
`prices[p.symbol] ? (p.category === 'crypto' ? '$' + prices[p.symbol].toLocaleString(undefined, {minimumFractionDigits: 2}) : prices[p.symbol].toFixed(5)) : "---"`
);

// Actually, let's just replace the exact faulty line directly
content = content.replace(/\\\`\\\$\\\$\{prices\[p\.symbol\]\.toLocaleString\(undefined, \{minimumFractionDigits: 2\}\)\}\\\`/g, "'$' + prices[p.symbol].toLocaleString(undefined, {minimumFractionDigits: 2})");

fs.writeFileSync('src/components/MarketTicker.tsx', content);
