const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace('startServer();\nexport default app;', 'export const initPromise = startServer();\nexport default app;');
code = code.replace('startServer();\n\nexport default app;', 'export const initPromise = startServer();\nexport default app;');

fs.writeFileSync('server.ts', code);
