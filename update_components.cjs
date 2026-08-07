const fs = require('fs');

function replaceInFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf-8');
    for (let i = 0; i < replacements.length; i++) {
        content = content.replace(replacements[i][0], replacements[i][1]);
    }
    fs.writeFileSync(filePath, content);
}

// 1. TradesManagementPage.tsx
replaceInFile('src/components/TradesManagementPage.tsx', [
    [`import { useRealtimeData } from "../hooks/useRealtimeData";`, `import { useLiveTrades } from "../hooks/useTradeState";`],
    [`const { positions: globalPositions } = useRealtimeData('positions');`, `const { activeTrades: globalPositions } = useLiveTrades();`]
]);

// 2. ClosedTrades.tsx
replaceInFile('src/components/ClosedTrades.tsx', [
    [`import { useRealtimeData } from "../hooks/useRealtimeData";`, `import { useLiveTrades } from "../hooks/useTradeState";`],
    [`const { positions } = useRealtimeData('positions');`, `const { activeTrades: positions } = useLiveTrades();`]
]);

// 3. AnalyticsDashboard.tsx
replaceInFile('src/components/AnalyticsDashboard.tsx', [
    [`import { useRealtimeData } from "../hooks/useRealtimeData";`, `import { useLiveTrades } from "../hooks/useTradeState";`],
    [`const { positions } = useRealtimeData('positions');`, `const { activeTrades: positions } = useLiveTrades();`]
]);

// 4. InteractiveChartsWorkspace.tsx
replaceInFile('src/components/InteractiveChartsWorkspace.tsx', [
    [`import { useRealtimeData } from "../hooks/useRealtimeData";`, `import { useRealtimeData } from "../hooks/useRealtimeData";\nimport { useLiveTrades } from "../hooks/useTradeState";`],
    [`const { positions, prices } = useRealtimeData();`, `const { prices } = useRealtimeData('prices');\n  const { activeTrades: positions } = useLiveTrades();`]
]);

