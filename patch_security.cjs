const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

// 1. Import rate limit
content = content.replace('import express from "express";', 'import express from "express";\nimport rateLimit from "express-rate-limit";');

// 2. Add rate limiters after auth middleware
const limitersCode = `
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: { error: "Too many requests, please try again later." }
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: "Too many AI evaluation requests, please try again later." }
});

app.use("/api", apiLimiter);
app.use("/api/ai", aiLimiter);
app.use("/api/trades", aiLimiter);
app.use("/api/agent-workspace", aiLimiter);
`;

content = content.replace('app.use("/api", requireAuth);', 'app.use("/api", requireAuth);\n' + limitersCode);

// 3. Fix KEYS_FILE usage
const keysRegex = /const KEYS_FILE = path\.join[\s\S]*?res\.json\(\{ status: "success" \}\);\n  \}\);/m;

const newKeysLogic = `
  // Secure Firestore-backed API Key Storage
  let keysLoaded = false;
  const loadKeysFromFirestore = async () => {
      if (keysLoaded || !db || firestoreDisabled) return;
      try {
          const snap = await db.collection("system").doc("keys").get();
          if (snap && snap.exists) {
              const storedKeys = snap.data();
              if (storedKeys.nvidia) process.env.NVIDIA_API_KEY = storedKeys.nvidia;
              if (storedKeys.polygon) process.env.POLYGON_API_KEY = storedKeys.polygon;
              if (storedKeys.finnhub) process.env.FINNHUB_API_KEY = storedKeys.finnhub;
              if (storedKeys.ctrader_client_id) process.env.CTRADER_CLIENT_ID = storedKeys.ctrader_client_id;
              if (storedKeys.ctrader_client_secret) process.env.CTRADER_CLIENT_SECRET = storedKeys.ctrader_client_secret;
              if (storedKeys.ctrader_access_token) process.env.CTRADER_ACCESS_TOKEN = storedKeys.ctrader_access_token;
          }
          keysLoaded = true;
      } catch (e) {
          console.warn("Could not load keys from Firestore:", e);
      }
  };

  // Run on startup
  loadKeysFromFirestore();

  app.get("/api/config/keys", async (req, res) => {
      await loadKeysFromFirestore();
      res.json({
          nvidia: !!process.env.NVIDIA_API_KEY,
          bybit: false,
          finnhub: !!process.env.FINNHUB_API_KEY,
          ctrader: !!(process.env.CTRADER_CLIENT_ID && process.env.CTRADER_CLIENT_SECRET),
          ctrader_needs_auth: !!(process.env.CTRADER_CLIENT_ID && process.env.CTRADER_CLIENT_SECRET && !process.env.CTRADER_ACCESS_TOKEN)
      });
  });

  app.post("/api/config/keys", express.json(), async (req, res) => {
      const { nvidia, polygon, finnhub, ctrader_client_id, ctrader_client_secret, ctrader_access_token } = req.body;
      
      if (nvidia) process.env.NVIDIA_API_KEY = nvidia;
      if (polygon) process.env.POLYGON_API_KEY = polygon;
      if (finnhub) process.env.FINNHUB_API_KEY = finnhub;
      if (ctrader_client_id) process.env.CTRADER_CLIENT_ID = ctrader_client_id;
      if (ctrader_client_secret) process.env.CTRADER_CLIENT_SECRET = ctrader_client_secret;
      
      if (ctrader_access_token) {
          process.env.CTRADER_ACCESS_TOKEN = ctrader_access_token;
          if (process.env.NODE_ENV !== "production") setupCTrader();
      }

      if (db && !firestoreDisabled) {
          try {
              await db.collection("system").doc("keys").set(req.body, { merge: true });
          } catch (e) {
              console.warn("Could not write keys to Firestore:", e);
              return res.status(500).json({ error: "Failed to save keys securely" });
          }
      }
      
      res.json({ status: "success" });
  });
`;

content = content.replace(keysRegex, newKeysLogic);

fs.writeFileSync('server.ts', content);
console.log('Patched security (rate limits + firestore keys)');
