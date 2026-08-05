const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Replace the endpoint with the new one
const oldEndpoint = `          if (agentState.status === "RUNNING") {
              const oldSetTimeout = global.setTimeout;
              global.setTimeout = ((fn: any) => fn()) as any; // mock setTimeout temporarily to run synchronously
              await runAutoTrade();
              global.setTimeout = oldSetTimeout;
          }`;
const newEndpoint = `          if (agentState.status === "RUNNING") {
              await runAutoTrade();
          }`;

code = code.replace(oldEndpoint, newEndpoint);

fs.writeFileSync('server.ts', code);
