const fs = require('fs');

function patchFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/const res = await fetch\((.*?)\);\s*const data = await res\.json\(\);/g, (match, p1) => {
        return `const res = await fetch(${p1});\n      if (!res.ok) throw new Error(\`HTTP \${res.status}\`);\n      const data = await res.json();`;
    });
    fs.writeFileSync(filePath, content);
}

patchFile('src/components/InteractiveChartsWorkspace.tsx');
patchFile('src/components/AgentControlPanel.tsx');
patchFile('src/components/ClosedTrades.tsx');
