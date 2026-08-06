const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldIntervals = `
  if (!process.env.VERCEL) setInterval(updatePrices, 3000); // Update every 3s
  if (!process.env.VERCEL) updatePrices();
`;
const oldManage = `
  if (!process.env.VERCEL) setInterval(managePositionsEngine, 3000);
`;

code = code.replace(oldIntervals.trim(), "");
code = code.replace(oldManage.trim(), "");

const newTick = `
  const runTick = async () => {
      try {
          await updatePrices();
          await managePositionsEngine();
          if (agentState.status === "RUNNING") {
              await runAutoTrade();
          }
          if (pusher) {
              pusher.trigger("trading-bot", "market-update", { prices: GLOBAL_PRICES });
              pusher.trigger("trading-bot", "positions-update", { positions: GLOBAL_POSITIONS });
          }
          saveTrades();
      } catch (err) {
          console.error("Local tick error:", err);
      }
  };

  if (!process.env.VERCEL) {
      setInterval(runTick, 3000);
      runTick();
  }
`;

// Insert the new tick loop after `runAutoTrade` definition
code = code.replace(/if \(!process\.env\.VERCEL\) runAutoTrade\(\);/g, `if (!process.env.VERCEL) runAutoTrade();\n${newTick}`);

// Also fix: remove the other calls
code = code.replace(/if \(!process\.env\.VERCEL\) setInterval\(updatePrices, 3000\); \/\/ Update every 3s/g, '');
code = code.replace(/if \(!process\.env\.VERCEL\) updatePrices\(\);/g, '');
code = code.replace(/if \(!process\.env\.VERCEL\) setInterval\(managePositionsEngine, 3000\);/g, '');

fs.writeFileSync('server.ts', code);
