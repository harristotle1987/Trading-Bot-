const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// replace the listen block with conditional listen
let target = `
  app.listen(PORT, "0.0.0.0", () => {
    console.log(\`Server running on http://localhost:\${PORT}\`);
  });
`;

let replacement = `
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(\`Server running on http://localhost:\${PORT}\`);
    });
  }
`;

code = code.replace(target, replacement);

// Also remove the conditional wrapper around startServer at the bottom
code = code.replace('if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {\n  startServer();\n}', 'startServer();');

fs.writeFileSync('server.ts', code);
