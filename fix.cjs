const fs = require('fs');
let content = fs.readFileSync('src/utils/tradeMath.ts', 'utf8');
content = content.replace(/\\\$\\{contractSize.toFixed\\(4\\)\\}\\`/g, '`${contractSize.toFixed(4)}`');
content = content.replace(/\\\`\\\$\\{contractSize.toFixed\\(4\\)\\}/g, '`${contractSize.toFixed(4)}');
fs.writeFileSync('src/utils/tradeMath.ts', content);
