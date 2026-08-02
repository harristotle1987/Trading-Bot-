const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Move `const app = express();` outside
code = code.replace('async function startServer() {\n  const app = express();', 'const app = express();\nasync function startServer() {');

// Export app
code = code.replace('startServer();', 'if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {\n  startServer();\n}\n\nexport default app;');

fs.writeFileSync('server.ts', code);
