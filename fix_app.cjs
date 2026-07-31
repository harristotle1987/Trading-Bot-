const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(
/          \{activeTab === "Trades" \? \(\n            <div className="h-full space-y-8 pb-8">\n              <TradesManagementPage onNavigateToChart=\{handleNavigateToChart\} \/>\n            <\/div>\n          \) : activeTab === "Agent" \? \(/g,
`          {activeTab === "Trades" ? (
            <div className="h-full flex flex-col pb-8">
              <TradesManagementPage onNavigateToChart={handleNavigateToChart} />
            </div>
          ) : activeTab === "Agent" ? (`
);
fs.writeFileSync('src/App.tsx', content);
