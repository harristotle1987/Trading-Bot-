const fs = require('fs');
let code = fs.readFileSync('src/components/InteractiveChartsWorkspace.tsx', 'utf8');

code = code.replace(
    /          \};\n          return \(\) => \{\n            if \(ws\) ws\.close\(\);\n          \};\n  \}, \[selectedSymbol, timeframe\]\);/,
    '          };\n      }\n      return () => {\n          if (ws) ws.close();\n      };\n    };\n    connectWebSocket();\n\n    return () => {\n      isMounted = false;\n      if (ws) ws.close();\n    };\n  }, [selectedSymbol, timeframe]);'
);

fs.writeFileSync('src/components/InteractiveChartsWorkspace.tsx', code);
