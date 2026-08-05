const fs = require('fs');
let file = 'src/components/InteractiveChartsWorkspace.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('let globalPricesForChart')) {
    code = code.replace('export default function InteractiveChartsWorkspace', 'let globalPricesForChart: Record<string, number> = {};\n\nexport default function InteractiveChartsWorkspace');
    fs.writeFileSync(file, code);
    console.log('Fixed global');
}
