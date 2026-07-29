const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(/const list = polygonData\.results\.map\(k => \[/g, 'const list = polygonData.results.map((k: any) => [');
content = content.replace(/const parsedLimit = parseInt\(limit\) \|\| 500;/g, 'const parsedLimit = parseInt(limit as string) || 500;');
fs.writeFileSync('server.ts', content);
