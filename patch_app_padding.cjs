const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
/<main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 relative w-full max-w-\[100vw\]">/g,
'<main className={`flex-1 overflow-auto relative w-full max-w-[100vw] ${activeTab === "Trades" ? "p-4 lg:p-0" : "p-4 md:p-6 lg:p-8"}`}>'
);

fs.writeFileSync('src/App.tsx', content);
