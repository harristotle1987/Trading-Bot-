const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldDelay = `      await new Promise(resolve => setTimeout(resolve, delay));`;
const newDelay = `      if (!process.env.VERCEL) await new Promise(resolve => setTimeout(resolve, delay));`;

code = code.replace(oldDelay, newDelay);
fs.writeFileSync('server.ts', code);
