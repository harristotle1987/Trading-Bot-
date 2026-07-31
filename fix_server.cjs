const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(
/          \/\/ Generate mock forex data\n          const parsedLimit = parseInt\(limit as string\) \|\| 500;\n          let intervalMs = 60000;\n          if \(interval === "1s"\) intervalMs = 1000;\n          if \(interval === "5"\) intervalMs = 300000;\n          if \(interval === "15"\) intervalMs = 900000;\n          if \(interval === "60"\) intervalMs = 3600000;\n          if \(interval === "D"\) intervalMs = 86400000;/g,
`          // Generate mock forex data
          if (interval === "1s") intervalMs = 1000;
`
);
fs.writeFileSync('server.ts', content);
