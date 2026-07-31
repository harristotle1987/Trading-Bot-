const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
/import APIKeysModal from ".\/components\/APIKeysModal";/g,
`import APIKeysModal from "./components/APIKeysModal";\nimport MarketTicker from "./components/MarketTicker";`
);

content = content.replace(
/        \{.* Top Bar .*\}\n        <TopNavbar \/>/g,
`        {/* Top Bar */}
        <TopNavbar />
        <MarketTicker />`
);

fs.writeFileSync('src/App.tsx', content);
