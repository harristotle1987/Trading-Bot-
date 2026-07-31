const fs = require('fs');
let content = fs.readFileSync('src/components/TradesManagementPage.tsx', 'utf8');

content = content.replace(
/import ClosedTrades from "\.\/ClosedTrades";\n/g,
''
);

content = content.replace(
/      <ClosedTrades \/>\n/g,
''
);

fs.writeFileSync('src/components/TradesManagementPage.tsx', content);
