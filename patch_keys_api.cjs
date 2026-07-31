const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

const apiCode = `
  app.get("/api/config/keys", (req, res) => {
      res.json({
          nvidia: !!process.env.NVIDIA_API_KEY,
          bybit: !!(process.env.BYBIT_API_KEY && process.env.BYBIT_API_SECRET),
          polygon: !!process.env.POLYGON_API_KEY,
          finnhub: !!process.env.FINNHUB_API_KEY
      });
  });

  app.post("/api/config/keys", express.json(), (req, res) => {
      const { nvidia, bybit_key, bybit_secret, polygon, finnhub } = req.body;
      if (nvidia) process.env.NVIDIA_API_KEY = nvidia;
      if (bybit_key) process.env.BYBIT_API_KEY = bybit_key;
      if (bybit_secret) process.env.BYBIT_API_SECRET = bybit_secret;
      if (polygon) process.env.POLYGON_API_KEY = polygon;
      if (finnhub) process.env.FINNHUB_API_KEY = finnhub;
      res.json({ status: "success" });
  });

  // Unified Trades Synchronization
`;

content = content.replace(/  \/\/ Unified Trades Synchronization/g, apiCode);
fs.writeFileSync('server.ts', content);
