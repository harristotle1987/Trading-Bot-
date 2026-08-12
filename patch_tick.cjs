const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const tickReplacement = `  app.all("/api/engine/tick", async (req, res) => {
      console.log("Engine tick triggered by CRON");
      try {
          // Stateless read
          if (db && !firestoreDisabled) {
              const snap = await db.collection("system").doc("trades").get();
              if (snap && snap.exists && snap.data().positions) {
                  GLOBAL_POSITIONS.splice(0, GLOBAL_POSITIONS.length, ...snap.data().positions);
                  nextPosId = GLOBAL_POSITIONS.length + 1;
              }
              const balancesSnap = await db.collection("system").doc("balances").get();
              if (balancesSnap && balancesSnap.exists) {
                  const data = balancesSnap.data();
                  if (data) {
                      demoBalance = data.demoBalance ?? demoBalance;
                      liveBalance = data.liveBalance ?? liveBalance;
                  }
              }
          }
          
          // 1. Update prices
          await updatePrices();
          
          // 2. Manage open positions (SL/TP)
          await managePositionsEngine();
          
          // Append current tick rates to history
          for (const sym of ["BTCUSDT", "ETHUSDT", "SOLUSDT", "EURUSD", "GBPUSD", "USDJPY"]) {
            const p = GLOBAL_PRICES[sym];
            if (p && p > 0) {
              if (!paperSymbolHistory[sym]) paperSymbolHistory[sym] = [];
              paperSymbolHistory[sym].push(p);
              if (paperSymbolHistory[sym].length > 40) {
                paperSymbolHistory[sym].shift();
              }
            }
          }
          // Continuously evaluate & generate signals every 15 seconds
          const now = Date.now();
          if (now - lastPaperSignalTime >= 15000) {
            lastPaperSignalTime = now;
            await generateContinuousPaperSignals();
          }
          // Periodically resolve expired database signals against live prices
          resolveActiveSignals(GLOBAL_PRICES).catch(err => {
              console.error("Error in automatic background signal resolution:", err);
          });
          
          // 3. Run auto trade AI logic (one pass, no setTimeout)
          if (agentState.status === "RUNNING") {
              await runAutoTrade();
          } else {
              agentState.current_activity = agentState.status;
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
  });`;

const regex = /app\.all\("\/api\/engine\/tick"[\s\S]*?res\.status\(500\)\.json\(\{ error: err\.message \}\);\s*\}\s*\}\);/;
content = content.replace(regex, tickReplacement);
fs.writeFileSync('server.ts', content);
console.log('Patched tick route');
