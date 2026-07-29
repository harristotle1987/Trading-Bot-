const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(
/  \/\/ Unified Trades Synchronization\n Engine, NVIDIA AI Inference & Finnhub News Pipeline/g,
`  // Unified Trades Synchronization Engine, NVIDIA AI Inference & Finnhub News Pipeline`
);
fs.writeFileSync('server.ts', content);
