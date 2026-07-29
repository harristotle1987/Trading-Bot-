const fs = require('fs');
let content = fs.readFileSync('src/components/MarketTicker.tsx', 'utf8');
content = content.replace(/\\\`\\\$\\\{/g, '`\\${');
fs.writeFileSync('src/components/MarketTicker.tsx', content);
