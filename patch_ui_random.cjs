const fs = require('fs');

// 1. RiskDashboard
let content = fs.readFileSync('src/components/RiskDashboard.tsx', 'utf8');
content = content.replace(/totalExposure: Math\.random\(\) \* 15000,/, 'totalExposure: 0, // Should be fetched from real backend');
content = content.replace(/dailyPnL: \(Math\.random\(\) - 0\.5\) \* 500,/, 'dailyPnL: 0, // Should be fetched from real backend');
fs.writeFileSync('src/components/RiskDashboard.tsx', content);

// 2. StrategyStudioWorkspace
content = fs.readFileSync('src/components/StrategyStudioWorkspace.tsx', 'utf8');
content = content.replace(/\(selectedStrategy\.defaultWinRate \+ \(Math\.random\(\) \* 1\.5 - 0\.75\)\)\.toFixed\(1\)/g, 'selectedStrategy.defaultWinRate.toFixed(1)');
fs.writeFileSync('src/components/StrategyStudioWorkspace.tsx', content);

console.log('Patched UI components');
