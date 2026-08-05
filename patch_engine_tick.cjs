const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. Add Pusher import and setup
if (!code.includes('const pusher =')) {
  const pusherSetup = `
import Pusher from 'pusher';
const pusher = process.env.PUSHER_APP_ID ? new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
}) : null;
`;
  code = code.replace('import express from "express";', pusherSetup + '\nimport express from "express";');
}

// 2. Add /api/engine/tick endpoint
if (!code.includes('/api/engine/tick')) {
  const tickEndpoint = `
  app.post("/api/engine/tick", async (req, res) => {
      console.log("Engine tick triggered by CRON");
      try {
          // 1. Update prices
          await updatePrices();
          
          // 2. Manage open positions (SL/TP)
          await managePositionsEngine();
          
          // 3. Run auto trade AI logic (one pass, no setTimeout)
          if (agentState.status === "RUNNING") {
              const oldSetTimeout = global.setTimeout;
              global.setTimeout = ((fn: any) => fn()) as any; // mock setTimeout temporarily to run synchronously
              await runAutoTrade();
              global.setTimeout = oldSetTimeout;
          }

          // 4. Broadcast updates via Pusher
          if (pusher) {
              pusher.trigger("trading-bot", "market-update", { prices: GLOBAL_PRICES });
              pusher.trigger("trading-bot", "positions-update", { positions: GLOBAL_POSITIONS });
          }

          // 5. Save state to Firestore
          saveTrades();
          
          res.json({ status: "success", message: "Tick executed", positions: GLOBAL_POSITIONS.length });
      } catch (err: any) {
          console.error("Tick error:", err);
          res.status(500).json({ error: err.message });
      }
  });
`;
  code = code.replace('// API Routes', '// API Routes\n' + tickEndpoint);
}

fs.writeFileSync('server.ts', code);
console.log('Patched server.ts with /api/engine/tick and Pusher');
