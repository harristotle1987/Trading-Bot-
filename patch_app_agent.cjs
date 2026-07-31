const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
/<AgentInsightPanel \/>/g,
'<AgentInsightPanel selectedSymbol={chartFocusSymbol || "BTCUSDT"} />'
);

content = content.replace(
/<main className="flex-1 overflow-auto p-4 md:p-8 relative">/g,
'<main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 relative w-full max-w-[100vw]">'
);

// wait, to make Trades management cover more space, we could do:
content = content.replace(
/className="h-full flex flex-col space-y-8 pb-8"/g,
'className="h-full flex flex-col space-y-6 pb-4 w-full"'
);

fs.writeFileSync('src/App.tsx', content);
