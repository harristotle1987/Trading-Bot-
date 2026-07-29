const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
/import APIKeysModal from "\.\/components\/APIKeysModal";\n/g,
'import HistoricalTradesModal from "./components/HistoricalTradesModal";\n'
);

content = content.replace(
/<APIKeysModal \/>/g,
'<HistoricalTradesModal />'
);

fs.writeFileSync('src/App.tsx', content);
