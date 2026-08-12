const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// 1. Move loadKeysFromFirestore higher up
const loadKeysRegex = /  let keysLoaded = false;\n  async function loadKeysFromFirestore\(\) \{[\s\S]*?      \}\n  \};/;
const loadKeysMatch = content.match(loadKeysRegex);
if (loadKeysMatch) {
  content = content.replace(loadKeysMatch[0], '');
  
  // Find where to insert it (e.g., right after `const app = express();`)
  content = content.replace('const app = express();', 'const app = express();\n' + loadKeysMatch[0]);
}

// 2. Fix typescript comparison in server.ts line ~3148
const compareRegex = /const timeframe = "1m";\s*let durationMs = 30000;\s*if \(timeframe === "1m"\) durationMs = 60000;\s*if \(timeframe === "2m"\) durationMs = 120000;/;
const compareReplacement = 'const timeframe = "1m" as string;\n      let durationMs = 30000;\n      if (timeframe === "1m") durationMs = 60000;\n      if (timeframe === "2m") durationMs = 120000;';
content = content.replace(compareRegex, compareReplacement);

fs.writeFileSync('server.ts', content);
console.log('Fixed build issues');
