const fs = require('fs');

function addImport(file) {
    let code = fs.readFileSync(file, 'utf8');
    if (!code.includes('import { useRealtimeData }')) {
        code = 'import { useRealtimeData } from "../hooks/useRealtimeData";\n' + code;
        fs.writeFileSync(file, code);
        console.log('Fixed ' + file);
    }
}

addImport('src/components/InteractiveChartsWorkspace.tsx');
addImport('src/components/QuickOrderPanel.tsx');

// also need to check what I did to InteractiveChartsWorkspace.tsx with globalPricesForChart
