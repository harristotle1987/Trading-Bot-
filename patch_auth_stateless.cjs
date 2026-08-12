const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

// 1. Remove interval loops
content = content.replace('setInterval(syncBalances, 30000);', '');
content = content.replace(/cTraderHeartbeatTimer = setInterval\(\(\) => \{[\s\S]*?\}, 25000\);/, '/* Heartbeat removed for serverless compatibility */');

// 2. Make syncBalances and loadTrades global so they can be called in tick
// Right now syncBalances is inside `try { if (db) { const syncBalances = ... } }`
// Let's extract them to global scope or at least accessible

// It's easier to just fetch from db directly in the tick if we need to.
// But wait, the prompt says: "transition to a purely request-driven architecture where Vercel Cron hits the /api/engine/tick endpoint to process trades, and all state (GLOBAL_POSITIONS) is read directly from Firestore on every request."

// So in `/api/engine/tick`:
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
          
          // 3. Run auto trade AI logic (one pass, no setTimeout)
          if (agentState.status === "RUNNING") {
              await runAutoTrade();
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

content = content.replace(/app\.all\("\/api\/engine\/tick", async \(req, res\) => \{[\s\S]*?res\.status\(500\)\.json\(\{ error: err\.message \}\);\s*\}\s*\}\);/, tickReplacement);

// 3. Add Firebase Auth Middleware
const authMiddleware = `import { adminAuth } from "./src/lib/firebase";

// Firebase Auth Middleware
const requireAuth = async (req, res, next) => {
    // Exclude health, public or webhook routes
    if (req.path.startsWith("/api/health") || req.path.startsWith("/api/pwa/version") || req.path === "/api/engine/tick") {
        return next();
    }
    
    // Check for Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized: Missing Bearer token" });
    }
    
    const idToken = authHeader.split("Bearer ")[1];
    try {
        if (adminAuth) {
            const decodedToken = await adminAuth.verifyIdToken(idToken);
            req.user = decodedToken;
        } else {
            // If Firebase Auth isn't properly initialized (e.g., missing keys), 
            // we could either fail or allow it for local dev. Let's allow local if disabled, but fail in prod
            if (process.env.NODE_ENV === "production") {
                return res.status(401).json({ error: "Unauthorized: Firebase Admin Auth not configured" });
            }
        }
        next();
    } catch (error) {
        console.error("Auth verification failed:", error);
        return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }
};

// Apply auth middleware to all /api routes
app.use("/api", requireAuth);`;

// Insert the auth middleware after the CORS and basic middleware
// Let's find `const app = express();`
content = content.replace('const app = express();', 'const app = express();\n' + authMiddleware);

fs.writeFileSync('server.ts', content);
console.log('Patched stateless and auth');
