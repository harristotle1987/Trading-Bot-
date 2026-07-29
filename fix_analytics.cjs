const fs = require('fs');
let content = fs.readFileSync('src/components/AnalyticsDashboard.tsx', 'utf8');

// The file currently has literal \`+\$\$\{totalPnL.toFixed(2)\}\`
content = content.replace(/\\\`\+\\\$\\\$\{/g, '`+$${');
content = content.replace(/\\\`-\\\$\\\$\{/g, '`-$${');
content = content.replace(/\\\`\\\$\\\$\{/g, '`$${');
content = content.replace(/\\\`/g, '`');

fs.writeFileSync('src/components/AnalyticsDashboard.tsx', content);
