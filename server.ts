import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { CTraderConnection } from "@reiryoku/ctrader-layer";

dotenv.config();

const app = express();
async function startServer() {
  const PORT = 3000;

  // API Routes
  

  let demoBalance = 10000;
  let liveBalance = 50000.0;
  let db: any = null;

  try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          const firebaseApp = initializeApp(config);
          db = getFirestore(firebaseApp, config.firestoreDatabaseId);

          getDoc(doc(db, "system", "balances")).then(snap => {
              if (snap.exists()) {
                  demoBalance = snap.data().demoBalance ?? 10000;
                  liveBalance = snap.data().liveBalance ?? 50000.0;
              } else {
                  setDoc(doc(db, "system", "balances"), { demoBalance, liveBalance });
              }
              console.log("Loaded demoBalance from Firestore:", demoBalance, "liveBalance:", liveBalance);
          }).catch(err => {
              console.error("Error loading demoBalance from Firestore:", err);
          });
      }
  } catch (err) {
      console.error("Firebase client SDK init error:", err);
  }


  // Global Price Cache
  const GLOBAL_PRICES: Record<string, number> = {};
  
  // cTrader Integration
  let cTraderConn: any = null;
  let cTraderAccountId: number | null = null;
  let cTraderSymbolMap: Record<number, string> = {};
  let cTraderNameMap: Record<string, number> = {};
  let cTraderDigitsMap: Record<number, number> = {};

  const setupCTrader = async () => {
      if (!process.env.CTRADER_CLIENT_ID || !process.env.CTRADER_CLIENT_SECRET) return;
      if (cTraderConn) return;

      try {
          cTraderConn = new CTraderConnection({
              host: "live.ctraderapi.com",
              port: 5035,
          });

          await cTraderConn.open();
          console.log("cTrader Connected");

          cTraderConn.on("ProtoOASpotEvent", (msg: any) => {
              if (msg.bid) {
                  const symbolName = cTraderSymbolMap[msg.symbolId];
                  const digits = cTraderDigitsMap[msg.symbolId] || 5;
                  if (symbolName) {
                      GLOBAL_PRICES[symbolName] = msg.bid / Math.pow(10, digits);
                  }
              }
          });

          await cTraderConn.sendCommand("ProtoOAApplicationAuthReq", {
              clientId: process.env.CTRADER_CLIENT_ID,
              clientSecret: process.env.CTRADER_CLIENT_SECRET,
          });
          console.log("cTrader App Authenticated");

          setInterval(() => cTraderConn.sendHeartbeat(), 25000);

          if (process.env.CTRADER_ACCESS_TOKEN) {
              const token = process.env.CTRADER_ACCESS_TOKEN;
              let accounts: any[] = [];
              try {
                  const res = await fetch(`https://api.spotware.com/connect/tradingaccounts?access_token=${token}`);
                  if (res.ok) {
                      const data = await res.json();
                      if (Array.isArray(data)) {
                          accounts = data;
                      } else if (data && Array.isArray(data.tradingAccounts)) {
                          accounts = data.tradingAccounts;
                      } else {
                          // Try to handle unexpected shapes if any
                          accounts = [data];
                      }
                  } else {
                      console.error("Failed to fetch cTrader accounts:", res.statusText);
                  }
              } catch (fetchErr) {
                  console.error("Error fetching cTrader accounts:", fetchErr);
              }
              if (accounts && accounts.length > 0) {
                  cTraderAccountId = accounts[0].accountId;
                  await cTraderConn.sendCommand("ProtoOAAccountAuthReq", {
                      accessToken: token,
                      ctidTraderAccountId: cTraderAccountId,
                  });
                  console.log("cTrader Account Authenticated:", cTraderAccountId);

                  const symbolsRes = await cTraderConn.sendCommand("ProtoOASymbolsListReq", {
                      ctidTraderAccountId: cTraderAccountId,
                  });

                  if (symbolsRes && symbolsRes.symbol) {
                      symbolsRes.symbol.forEach((sym: any) => {
                          cTraderSymbolMap[sym.symbolId] = sym.symbolName;
                          cTraderNameMap[sym.symbolName] = sym.symbolId;
                      });
                      
                      const forexSymbols = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "USDCHF", "NZDUSD", "EURGBP", "EURJPY", "GBPJPY", "AUDJPY", "EURAUD", "GBPCAD", "CADJPY", "CHFJPY"];
      const stockSymbols = ["AAPL", "MSFT", "TSLA", "AMZN", "GOOGL", "NVDA", "META"];
                      
                      const symbolIdsToSubscribe = forexSymbols
                          .map(s => cTraderNameMap[s])
                          .filter(id => id !== undefined);

                      if (symbolIdsToSubscribe.length > 0) {
                          const detailsRes = await cTraderConn.sendCommand("ProtoOASymbolByIdReq", {
                              ctidTraderAccountId: cTraderAccountId,
                              symbolId: symbolIdsToSubscribe
                          });
                          
                          if (detailsRes && detailsRes.symbol) {
                              detailsRes.symbol.forEach((sym: any) => {
                                  cTraderDigitsMap[sym.symbolId] = sym.digits;
                              });
                          }

                          await cTraderConn.sendCommand("ProtoOASubscribeSpotsReq", {
                              ctidTraderAccountId: cTraderAccountId,
                              symbolId: symbolIdsToSubscribe
                          });
                          console.log("Subscribed to cTrader spots:", symbolIdsToSubscribe);
                      }
                  }
              }
          }
      } catch (e: any) {
          console.error("cTrader Setup Error:", e);
      }
  };
  
  setupCTrader();

const updatePrices = async () => {
      const cryptoSymbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "BNBUSDT", "ADAUSDT", "DOGEUSDT", "AVAXUSDT", "LINKUSDT", "DOTUSDT", "NEARUSDT", "SUIUSDT", "APTUSDT", "MATICUSDT", "LTCUSDT", "UNIUSDT", "ATOMUSDT", "ETCUSDT", "FILUSDT", "ARBUSDT"];
      const forexSymbols = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "USDCHF", "NZDUSD", "EURGBP", "EURJPY", "GBPJPY", "AUDJPY", "EURAUD", "GBPCAD", "CADJPY", "CHFJPY"];
      const stockSymbols = ["AAPL", "MSFT", "TSLA", "AMZN", "GOOGL", "NVDA", "META"];
      
      try {
// Crypto & Forex from Finnhub if available
          if (process.env.FINNHUB_API_KEY) {
              // Finnhub Crypto
              for (const s of cryptoSymbols) {
                  try {
                      const finnhubRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=BINANCE:${s}&token=${process.env.FINNHUB_API_KEY}`);
                      if (finnhubRes.ok) {
                          const data = await finnhubRes.json();
                          if (data && data.c) GLOBAL_PRICES[s] = data.c;
                      }
                      await new Promise(r => setTimeout(r, 35)); // avoid rate limit (30 API calls/sec for free tier)
                  } catch (e) {
                      console.warn(`Finnhub fetch failed for ${s}`);
                  }
              }
              // Finnhub Forex
              for (const s of forexSymbols) {
                  try {
                      const finnhubSymbol = `OANDA:${s.substring(0,3)}_${s.substring(3)}`;
                      const finnhubRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${finnhubSymbol}&token=${process.env.FINNHUB_API_KEY}`);
                      if (finnhubRes.ok) {
                          const data = await finnhubRes.json();
                          if (data && data.c && data.c !== 0) GLOBAL_PRICES[s] = data.c;
                      }
                      await new Promise(r => setTimeout(r, 35));
                  } catch (e) {
                      console.warn(`Finnhub fetch failed for ${s}`);
                  }
              }
              // Finnhub Stocks
              for (const s of stockSymbols) {
                  try {
                      const finnhubRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${s}&token=${process.env.FINNHUB_API_KEY}`);
                      if (finnhubRes.ok) {
                          const data = await finnhubRes.json();
                          if (data && data.c && data.c !== 0) GLOBAL_PRICES[s] = data.c;
                      }
                      await new Promise(r => setTimeout(r, 35));
                  } catch (e) {
                      console.warn(`Finnhub fetch failed for ${s}`);
                  }
              }

          } else {
              // Fallback to Binance for Crypto
              try {
                  const binanceRes = await fetch("https://api.binance.com/api/v3/ticker/price");
                  if (binanceRes.ok) {
                      const binanceData = await binanceRes.json();
                      for (const s of cryptoSymbols) {
                          const ticker = binanceData.find((t: any) => t.symbol === s);
                          if (ticker) GLOBAL_PRICES[s] = parseFloat(ticker.price);
                      }
                  }
              } catch (e) {
                  console.warn("Binance fallback failed", e);
              }
          }

          // Forex from Polygon as secondary fallback
          const forexFallbacks: Record<string, number> = {
            "EURUSD": 1.0850, "GBPUSD": 1.2850, "USDJPY": 150.00, "AUDUSD": 0.6700,
            "USDCAD": 1.3600, "USDCHF": 0.9200, "NZDUSD": 0.6100, "EURGBP": 0.8400,
            "EURJPY": 160.00, "GBPJPY": 185.00, "AUDJPY": 95.00, "EURAUD": 1.6500,
            "GBPCAD": 1.7500, "CADJPY": 105.00, "CHFJPY": 170.00
          };
          
          if (process.env.CTRADER_CLIENT_ID && process.env.CTRADER_CLIENT_SECRET) {
              for (const s of forexSymbols) {
                  if (!GLOBAL_PRICES[s]) GLOBAL_PRICES[s] = forexFallbacks[s] || 1.0;
              }
          } else if (!process.env.FINNHUB_API_KEY && process.env.POLYGON_API_KEY) { } else if (process.env.POLYGON_API_KEY) {
              let keyForbidden = false;
              for (const s of forexSymbols) {
                  if (keyForbidden) {
                      if (!GLOBAL_PRICES[s]) GLOBAL_PRICES[s] = forexFallbacks[s] || 1.0;
                      else GLOBAL_PRICES[s] += GLOBAL_PRICES[s] * (Math.random() * 0.0001 * 2 - 0.0001);
                      continue;
                  }
                  
                  // Polygon expects forex symbols in a specific format (e.g., EUR/USD)
                  const polygonSymbol = `C:${s.substring(0,3)}${s.substring(3)}`;
                  try {
                      const res = await fetch(`https://api.polygon.io/v2/snapshot/locale/global/markets/forex/tickers/${polygonSymbol}?apiKey=${process.env.POLYGON_API_KEY}`);
                      
                      if (res.status === 403) {
                          keyForbidden = true;
                          throw new Error("Forbidden");
                      }
                      if (!res.ok) {
                          throw new Error(`Polygon fetch failed for ${s}: ${res.statusText}`);
                      }
                      
                      const data = await res.json();
                      if (data.results?.ticker?.min?.c) {
                          GLOBAL_PRICES[s] = data.results.ticker.min.c;
                      } else {
                          throw new Error(`Polygon fetch returned no data for ${s}`);
                      }
                  } catch (e) {
                      if (e.message === "Forbidden") {
                          console.warn("Polygon API key is Forbidden. Switching to fallbacks.");
                      } else {
                          console.warn(`Falling back to default price for ${s} due to:`, e.message);
                      }
                      if (!GLOBAL_PRICES[s]) GLOBAL_PRICES[s] = forexFallbacks[s] || 1.0;
                      else GLOBAL_PRICES[s] += GLOBAL_PRICES[s] * (Math.random() * 0.0001 * 2 - 0.0001);
                  }
              }
          } else {
            forexSymbols.forEach(s => {
                if (!GLOBAL_PRICES[s]) {
                    GLOBAL_PRICES[s] = forexFallbacks[s] || 1.0;
                } else {
                    // Simulate random tick movement if no live API
                    const volatility = 0.0001;
                    const change = GLOBAL_PRICES[s] * (Math.random() * volatility * 2 - volatility);
                    GLOBAL_PRICES[s] = GLOBAL_PRICES[s] + change;
                }
            });
          }
          
      } catch (e) {
          console.error("Failed to update prices:", e);
      }
  };
  
  setInterval(updatePrices, 3000); // Update every 3s
  updatePrices();

  app.get("/api/account/balances", async (req, res) => {
      console.log("Fetching balances... started");
      // Demo Capital Engine
      const demo_data = {
          total_equity: demoBalance,
          available_balance: demoBalance,
          currency: "USDT",
          status: "ONLINE"
      };
      console.log("Demo balance fetched:", demoBalance);

      // Live Capital Engine
      
      let live_data = { total_equity: liveBalance, available_balance: liveBalance, currency: "USDT", status: "SIMULATED" };
      
      console.log("Sending balances response...");
      res.json({
          demo: demo_data,
          live: live_data
      });
  });

  app.post("/api/account/balance/reset", (req, res) => {
    demoBalance = 10000;
    if (db) setDoc(doc(db, "system", "balances"), { demoBalance, liveBalance }, { merge: true }).catch(console.error);
    res.json({ balance: demoBalance });
  });
  
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Risk API Mocks for UI Development
  let riskSettings = {
    max_concurrent_trades: 3,
    max_daily_drawdown_pct: 0.05,
    max_spread_pct: 0.001,
    default_risk_pct: 0.01,
    default_trade_amount: 100,
    autoTrade: {
        active: false,
        min_profit_threshold: 0.75,
        trade_capital_alloc: 1000,
        sl_threshold_pct: 0.02,
        tp_threshold_pct: 0.06,
        max_daily_loss: 500
    }
  };

  if (db) {
      getDoc(doc(db, "system", "riskSettings")).then(snap => {
          if (snap.exists()) {
              riskSettings = { ...riskSettings, ...snap.data() };
              console.log("Loaded riskSettings from Firestore");
          }
      }).catch(err => console.error("Error loading riskSettings:", err));
  }

  app.get("/api/risk/settings", (req, res) => {
    res.json(riskSettings);
  });

  app.post("/api/risk/settings", express.json(), (req, res) => {
    riskSettings = { ...riskSettings, ...req.body };
    if (db) setDoc(doc(db, "system", "riskSettings"), riskSettings, { merge: true }).catch(console.error);
    res.json(riskSettings);
  });

  app.get("/api/risk/metrics", (req, res) => {
    res.json({
      total_exposure: 12500.50,
      daily_pnl: -150.25,
      active_positions: 1,
      equity: 50000.00
    });
  });

  let orders: any[] = [];
  let GLOBAL_POSITIONS: any[] = [];
  let positions: any[] = GLOBAL_POSITIONS;
  let nextOrderId = 1;
  
  let nextPosId = 1;

  if (db) {
      getDoc(doc(db, "system", "trades")).then(snap => {
          if (snap.exists() && snap.data().positions) {
              GLOBAL_POSITIONS.splice(0, GLOBAL_POSITIONS.length, ...snap.data().positions);
              nextPosId = GLOBAL_POSITIONS.length + 1;
              console.log("Loaded " + GLOBAL_POSITIONS.length + " trades from Firestore");
          }
      }).catch(err => console.error("Error loading trades:", err));
  }

  const saveTrades = () => {
      if (db) setDoc(doc(db, "system", "trades"), { positions: GLOBAL_POSITIONS }).catch(console.error);
  };

  app.get("/api/execution/positions", (req, res) => {
    console.log("Fetching positions...");
    res.json({ positions });
  });

  app.get("/api/execution/orders", (req, res) => {
    res.json({ orders });
  });

  app.post("/api/execution/order/create", express.json(), (req, res) => {
    const order = { ...req.body, id: nextOrderId++, status: "FILLED" };
    orders.push(order);
    
    // Auto-create a position mock
    const posIndex = positions.findIndex(p => p.symbol === order.symbol);
    if (posIndex > -1) {
        positions[posIndex].size += order.quantity;
    } else {
        positions.push({
            id: nextOrderId++,
            symbol: order.symbol,
            side: order.side,
            size: order.quantity,
            entry_price: order.price || 50000.0,
            mark_price: order.price || 50000.0,
            unrealized_pnl: 0.0,
            realized_pnl: 0.0,
            status: "OPEN"
        });
    }

    // Sync with unified trades engine
    const unifiedPos = {
        id: `demo_pos_${nextPosId++}`,
        account_mode: "LIVE", // Execution panel trades map to LIVE for this mock
        broker: "CTRADER",
        symbol: order.symbol,
        side: order.side === 'LONG' ? 'BUY' : 'SELL',
        quantity: order.quantity,
        entry_price: order.price || 50000.0,
        current_mark_price: order.price || 50000.0,
        stop_loss: order.stop_loss || 0,
        take_profit: order.take_profit || 0,
        unrealized_pnl: 0.00,
        ai_confidence_score: 95.0,
        status: "OPEN",
        opened_at: new Date().toISOString()
    };
    GLOBAL_POSITIONS.push(unifiedPos); saveTrades();

    res.json({ status: "success", order });
  });

  app.post("/api/execution/position/close/:symbol", (req, res) => {
    positions = positions.filter(p => p.symbol !== req.params.symbol);
    
    // Also close in unified trades
    const pos = GLOBAL_POSITIONS.find(p => p.symbol === req.params.symbol && p.status === "OPEN");
    if (pos) {
        pos.status = "CLOSED"; saveTrades();
        pos.closed_at = new Date().toISOString();
    }
    
    res.json({ status: "success" });
  });

  app.post("/api/execution/order/cancel/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const order = orders.find(o => o.id === id);
    if (order) order.status = "CANCELLED";
    res.json({ status: "success" });
  });

  let agentState = {
    status: "IDLE", // IDLE, RUNNING, PAUSED, EMERGENCY_STOP
    current_activity: "IDLE",
    uptime: 0,
    loop_latency: 0,
    total_trades: 0,
    session_pnl: 0.0
  };

  app.post("/api/agent/start", (req, res) => {
    agentState.status = "RUNNING";
    res.json(agentState);
  });
  
  app.post("/api/agent/pause", (req, res) => {
    agentState.status = "PAUSED";
    res.json(agentState);
  });
  
  app.post("/api/agent/stop", (req, res) => {
    agentState.status = "IDLE";
    res.json(agentState);
  });
  
  app.post("/api/agent/kill-switch", (req, res) => {
    agentState.status = "EMERGENCY_STOP";
    res.json(agentState);
  });
  
  app.get("/api/agent/status", (req, res) => {
    if (agentState.status === "RUNNING") {
        agentState.uptime += 1;
        agentState.loop_latency = Math.floor(Math.random() * 50) + 10;
        if (Math.random() > 0.8) {
            agentState.total_trades += 1;
            agentState.session_pnl += (Math.random() * 10 - 4);
        }
    }
    res.json(agentState);
  });

  // Phase 9: Sentiment & Macro Events Mocks
  app.get("/api/sentiment/latest/:symbol", (req, res) => {
    const symbol = req.params.symbol;
    const isBullish = Math.random() > 0.4; // 60% chance bullish for mock
    
    // Simulating score from -1.0 to 1.0
    const aggregateScore = isBullish ? (Math.random() * 0.8 + 0.1) : -(Math.random() * 0.8 + 0.1);
    
    let label = "NEUTRAL";
    if (aggregateScore >= 0.5) label = "STRONG BULLISH";
    else if (aggregateScore > 0.1) label = "BULLISH";
    else if (aggregateScore <= -0.5) label = "STRONG BEARISH";
    else if (aggregateScore < -0.1) label = "BEARISH";

    res.json({
        aggregate: {
            score: aggregateScore,
            label,
            lastUpdated: new Date().toISOString()
        },
        headlines: [
            {
                title: "Bitcoin ETFs see record inflows as institutional adoption accelerates.",
                source: "CoinDesk",
                published_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
                impact: "HIGH",
                sentiment_score: 0.85
            },
            {
                title: "Regulatory concerns emerge over new stablecoin bill draft.",
                source: "Bloomberg Crypto",
                published_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
                impact: "MEDIUM",
                sentiment_score: -0.45
            },
            {
                title: "Top analyst predicts massive breakout for major altcoins this week.",
                source: "CryptoNews",
                published_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
                impact: "LOW",
                sentiment_score: 0.35
            },
            {
                title: "Network difficulty adjusts to all-time high amidst hash rate surge.",
                source: "Bitcoin Magazine",
                published_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
                impact: "MEDIUM",
                sentiment_score: 0.60
            }
        ]
    });
  });

  app.get("/api/sentiment/macro-calendar", (req, res) => {
      res.json({
          events: [
              {
                  event: "Core CPI (MoM)",
                  country: "US",
                  time: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
                  impact: "HIGH",
                  actual: null,
                  forecast: "0.3%",
                  previous: "0.4%"
              },
              {
                  event: "Fed Interest Rate Decision",
                  country: "US",
                  time: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
                  impact: "CRITICAL",
                  actual: null,
                  forecast: "5.25%",
                  previous: "5.50%"
              },
              {
                  event: "ECB Press Conference",
                  country: "EU",
                  time: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
                  impact: "HIGH",
                  actual: "Done",
                  forecast: "-",
                  previous: "-"
              },
              {
                  event: "Initial Jobless Claims",
                  country: "US",
                  time: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
                  impact: "MEDIUM",
                  actual: "212K",
                  forecast: "215K",
                  previous: "210K"
              }
          ]
      });
  });

  // Phase 11: Forensic Analysis Agent
  app.post("/api/agent/forensics", express.json(), async (req, res) => {
      const { symbol, timeframe } = req.body;
      
      // Simulated data-driven analysis
      const winRate = (Math.random() * 20 + 75).toFixed(1);
      const bias = Math.random() > 0.5 ? "STRONG BUY" : "STRONG SELL";
      
      // NOTE: In a production Neon/Supabase environment, you would log this to 
      // the agent_forensic_audits table here.
      
      res.json({
          symbol,
          win_rate_probability: parseFloat(winRate),
          directional_bias: bias,
          ta_confluence_score: 0.85,
          sentiment_score: 0.40,
          forensic_summary: `15m EMA Golden Cross + RSI ${bias === "STRONG BUY" ? "Oversold" : "Overbought"} + Positive News Sentiment.`,
          suggested_entry: 65200.0,
          suggested_sl: 64500.0,
          suggested_tp: 66600.0
      });
  });


  app.get("/api/config/keys", (req, res) => {
      res.json({
          nvidia: !!process.env.NVIDIA_API_KEY,
          bybit: false,
          polygon: !!process.env.POLYGON_API_KEY,
          finnhub: !!process.env.FINNHUB_API_KEY,
          ctrader: !!(process.env.CTRADER_CLIENT_ID && process.env.CTRADER_CLIENT_SECRET),
          ctrader_needs_auth: !!(process.env.CTRADER_CLIENT_ID && process.env.CTRADER_CLIENT_SECRET && !process.env.CTRADER_ACCESS_TOKEN)
      });
  });

  app.post("/api/config/keys", express.json(), (req, res) => {
      const { nvidia, polygon, finnhub, ctrader_client_id, ctrader_client_secret, ctrader_access_token } = req.body;
      if (nvidia) process.env.NVIDIA_API_KEY = nvidia;
      
      
      if (polygon) process.env.POLYGON_API_KEY = polygon;
      if (finnhub) process.env.FINNHUB_API_KEY = finnhub;
      if (ctrader_client_id) process.env.CTRADER_CLIENT_ID = ctrader_client_id;
      if (ctrader_client_secret) process.env.CTRADER_CLIENT_SECRET = ctrader_client_secret;
      if (ctrader_access_token) {
          process.env.CTRADER_ACCESS_TOKEN = ctrader_access_token;
          setupCTrader();
      }
      res.json({ status: "success" });
  });

  app.get("/api/ctrader/auth", (req, res) => {
      const client_id = process.env.CTRADER_CLIENT_ID;
      if (!client_id) {
          return res.status(400).send("cTrader Client ID not configured on server.");
      }
      
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const proto = req.headers['x-forwarded-proto'] || 'https';
      const redirect_uri = `${proto}://${host}/api/ctrader/callback`;
      
      const authUrl = `https://openapi.ctrader.com/apps/auth?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&scope=trading`;
      res.redirect(authUrl);
  });

  app.get("/api/ctrader/callback", async (req, res) => {
      const { code } = req.query;
      if (!code) return res.status(400).send("No code provided");

      const client_id = process.env.CTRADER_CLIENT_ID;
      const client_secret = process.env.CTRADER_CLIENT_SECRET;
      
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const proto = req.headers['x-forwarded-proto'] || 'https';
      const redirect_uri = `${proto}://${host}/api/ctrader/callback`;

      try {
          const tokenRes = await fetch(`https://connect.spotware.com/oauth/v2/token?grant_type=authorization_code&code=${code}&client_id=${client_id}&client_secret=${client_secret}&redirect_uri=${encodeURIComponent(redirect_uri)}`);
          const tokenData = await tokenRes.json();
          
          if (tokenData.accessToken || tokenData.access_token) {
              const token = tokenData.accessToken || tokenData.access_token;
              process.env.CTRADER_ACCESS_TOKEN = token;
              
              // Restart cTrader connection with new token
              setupCTrader();

              res.send(`
                <html>
                  <body>
                    <h2 style="font-family: sans-serif;">Successfully authenticated with cTrader!</h2>
                    <p style="font-family: sans-serif;">You can close this window and return to the app.</p>
                    <script>
                        if (window.opener) {
                            window.opener.postMessage({ type: 'CTRADER_OAUTH_SUCCESS', token: '${token}' }, '*');
                        }
                    </script>
                  </body>
                </html>
              `);
          } else {
              res.status(400).json(tokenData);
          }
      } catch (e: any) {
          res.status(500).json({ error: e.message });
      }
  });

  // Unified Trades Synchronization Engine, NVIDIA AI Inference & Finnhub News Pipeline
  app.get("/api/ai/finnhub-news", async (req, res) => {
      const finnhubKey = process.env.FINNHUB_API_KEY;
      if (finnhubKey) {
          try {
              const symbol = req.query.symbol;
              const url = symbol 
                ? `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0]}&to=${new Date().toISOString().split('T')[0]}&token=${finnhubKey}`
                : `https://finnhub.io/api/v1/news?category=general&token=${finnhubKey}`;
              const finnhubRes = await fetch(url);
              if (finnhubRes.ok) {
                  const data = await finnhubRes.json();
                  return res.json(data);
              }
          } catch (err) {
              console.error("Finnhub fetch error:", err);
          }
      }
      
      // Stub for Finnhub fetch, as requested to be integrated
      // Use real API keys in production via process.env.FINNHUB_API_KEY
      res.json([
          { headline: "Market rally continues amid tech earnings." },
          { headline: "Crypto markets see massive inflows." }
      ]);
  });

  app.post("/api/ai/evaluate-pair", express.json(), async (req, res) => {
      // Stub for NVIDIA NIM AI integration
      // Use real API keys in production via process.env.NVIDIA_API_KEY
      const { symbol, ta_summary } = req.body;
      res.json({
          win_rate_probability: 75.0,
          directional_bias: "BUY",
          reasoning: "Fallback signal based on local indicator momentum and positive news sentiment."
      });
  });

  // Agent Workspace API
  

  app.get("/api/agent-workspace/scan", async (req, res) => {
    const mode = req.query.mode || "DEMO";
    
    // Simulating deep forensic scan
    await new Promise(r => setTimeout(r, 800)); // Simulating thorough I/O
    
    const sample_recommendations = [
        {
            symbol: "SOLUSDT",
            category: "CRYPTO",
            directional_bias: "STRONG BUY",
            win_rate_probability: 88.5,
            timeframe: "15m",
            reasoning: "High institutional volume confluence with favorable macro news trajectory.",
            suggested_entry: 142.50,
            suggested_sl: 139.80,
            suggested_tp: 148.00
        },
        {
            symbol: "EURUSD",
            category: "FOREX",
            directional_bias: "STRONG SELL",
            win_rate_probability: 84.2,
            timeframe: "15m",
            reasoning: "Rejection at 1.0880 resistance band + MACD bearish divergence, NIM sentiment confirms.",
            suggested_entry: 1.0850,
            suggested_sl: 1.0890,
            suggested_tp: 1.0770
        },
        {
            symbol: "ETHUSDT",
            category: "CRYPTO",
            directional_bias: "BUY",
            win_rate_probability: 82.1,
            timeframe: "15m",
            reasoning: "Holding 200 EMA support + Positive Sentiment Score (+0.45), backed by Finnhub.",
            suggested_entry: 3450.00,
            suggested_sl: 3390.00,
            suggested_tp: 3580.00
        },
        {
            symbol: "DOTUSDT",
            category: "CRYPTO",
            directional_bias: "STRONG BUY",
            win_rate_probability: 89.2,
            timeframe: "1h",
            reasoning: "Multi-timeframe (15m, 1h) accumulation + AI score 92.4, strong structural base.",
            suggested_entry: 7.20,
            suggested_sl: 6.85,
            suggested_tp: 8.50
        }
    ];
    
    res.json({
        timestamp: new Date().toISOString(),
        active_mode: (mode as string).toUpperCase(),
        recommended_pairs: sample_recommendations
    });
  });

  app.get("/api/agent-workspace/demo/account", (req, res) => {
    res.json({ balance: demoBalance, currency: "USDT", equity: demoBalance, open_positions: GLOBAL_POSITIONS });
  });

  async function getCurrentMarketPrice(symbol: string): Promise<number | null> {
    try {
        const binanceRes = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
        if (binanceRes.ok) {
            const data = await binanceRes.json();
            return parseFloat(data.price);
        }
// Fallback to Finnhub
        if (process.env.FINNHUB_API_KEY) {
            const finnhubRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=BINANCE:${symbol}&token=${process.env.FINNHUB_API_KEY}`);
            if (finnhubRes.ok) {
                const data = await finnhubRes.json();
                if (data && data.c) {
                    return parseFloat(data.c);
                }
            }
        }
    } catch (e) {
        console.error("Failed to fetch market price", e);
    }
    return null;
}

app.post("/api/agent-workspace/demo/place-order", express.json(), async (req, res) => {
    const order = req.body;
    const currentPrice = await getCurrentMarketPrice(order.symbol);
    const entry = currentPrice || order.price || 142.50;

    const amount = order.amount || (order.qty * entry);
    if (demoBalance < amount) {
        return res.status(400).json({ error: "Insufficient demo balance" });
    }
    
    demoBalance -= amount;
    if (db) setDoc(doc(db, "system", "balances"), { demoBalance }, { merge: true }).catch(console.error);
    
    // Recalculate SL/TP if based on original entry
    let sl = order.stop_loss;
    let tp = order.take_profit;
    if (order.price && currentPrice && currentPrice !== order.price) {
        const diffRatio = currentPrice / order.price;
        if (sl) sl = parseFloat((sl * diffRatio).toFixed(4));
        if (tp) tp = parseFloat((tp * diffRatio).toFixed(4));
    }

    const position = {
        id: `demo_pos_${nextPosId++}`,
        account_mode: "DEMO",
        broker: "CTRADER",
        symbol: order.symbol,
        side: order.side,
        quantity: order.qty,
        entry_price: entry,
        current_mark_price: entry,
        stop_loss: sl,
        take_profit: tp,
        unrealized_pnl: 0.00,
        ai_confidence_score: 88.5,
        status: "OPEN",
        opened_at: new Date().toISOString()
    };
    GLOBAL_POSITIONS.push(position); saveTrades();

    // Also push to the global execution mock arrays
    const executionSide = order.side === 'BUY' ? 'LONG' : 'SHORT';
    const orderRecord = { 
        id: nextOrderId++, 
        symbol: order.symbol,
        side: executionSide,
        order_type: order.order_type || "MARKET",
        quantity: order.qty,
        price: entry,
        status: "FILLED" 
    };
    orders.push(orderRecord);

    const posIndex = positions.findIndex(p => p.symbol === order.symbol);
    if (posIndex > -1) {
        positions[posIndex].size += order.qty;
    } else {
        positions.push({
            symbol: order.symbol,
            side: executionSide,
            size: order.qty,
            entry_price: entry,
            mark_price: entry,
            unrealized_pnl: 0.00
        });
    }

    res.json({ status: "SUCCESS", message: `Demo ${order.side} order placed for ${order.symbol}`, position });
  });
  
  app.post("/api/agent-workspace/live/place-order", express.json(), async (req, res) => {
    const order = req.body;
    const currentPrice = await getCurrentMarketPrice(order.symbol);
    const entry = currentPrice || order.price || 142.50;

    const amount = order.amount || (order.qty * entry);
    if (liveBalance < amount) {
        return res.status(400).json({ error: "Insufficient live balance" });
    }
    
    liveBalance -= amount;
    if (db) setDoc(doc(db, "system", "balances"), { liveBalance }, { merge: true }).catch(console.error);

    let sl = order.stop_loss;
    let tp = order.take_profit;
    if (order.price && currentPrice && currentPrice !== order.price) {
        const diffRatio = currentPrice / order.price;
        if (sl) sl = parseFloat((sl * diffRatio).toFixed(4));
        if (tp) tp = parseFloat((tp * diffRatio).toFixed(4));
    }

    const position = {
        id: `live_pos_${nextPosId++}`,
        account_mode: "LIVE",
        broker: "BINANCE",
        symbol: order.symbol,
        side: order.side,
        quantity: order.qty,
        entry_price: entry,
        current_mark_price: entry,
        stop_loss: sl,
        take_profit: tp,
        unrealized_pnl: 0.00,
        ai_confidence_score: 92.5,
        status: "OPEN",
        opened_at: new Date().toISOString()
    };
    GLOBAL_POSITIONS.push(position); saveTrades();

    // Also push to the global execution mock arrays
    const executionSide = order.side === 'BUY' ? 'LONG' : 'SHORT';
    const orderRecord = { 
        id: nextOrderId++, 
        symbol: order.symbol,
        side: executionSide,
        order_type: order.order_type || "MARKET",
        quantity: order.qty,
        price: entry,
        status: "FILLED" 
    };
    orders.push(orderRecord);

    const posIndex = positions.findIndex(p => p.symbol === order.symbol);
    if (posIndex > -1) {
        positions[posIndex].size += order.qty;
    } else {
        positions.push({
            symbol: order.symbol,
            side: executionSide,
            size: order.qty,
            entry_price: entry,
            mark_price: entry,
            unrealized_pnl: 0.00
        });
    }

    res.json({ status: "SUCCESS", message: `Live ${order.side} order placed for ${order.symbol}`, position });
  });
  
  app.get("/api/trades/active", async (req, res) => {
    console.log("Fetching active trades, query:", req.query);
    const mode = req.query.account_mode;
    
    let active = GLOBAL_POSITIONS.filter(p => p.status === "OPEN");
    if (mode && mode !== "ALL") {
        active = active.filter(p => p.account_mode === mode);
    }
    console.log("Found active positions:", active.length);
    res.json(active);
  });

  app.get("/api/trades/closed", (req, res) => {
    console.log("Fetching closed trades...");
    try {
        console.log("GLOBAL_POSITIONS type:", typeof GLOBAL_POSITIONS);
        console.log("GLOBAL_POSITIONS value:", GLOBAL_POSITIONS);
        const closed = GLOBAL_POSITIONS ? GLOBAL_POSITIONS.filter(p => p.status === "CLOSED") : [];
        res.json(closed);
    } catch (e) {
        console.error("Error in /api/trades/closed:", e);
        res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/trades/execute", express.json(), async (req, res) => {
    const { symbol, side, capital, execution_price, account_mode } = req.body;
    if (account_mode === "DEMO") {
        if (demoBalance < capital) {
            return res.status(400).json({ error: "Insufficient balance" });
        }
        demoBalance -= capital;
        if (db) setDoc(doc(db, "system", "balances"), { demoBalance }, { merge: true }).catch(console.error);
    } else {
        return res.status(400).json({ error: "Live mode not supported for this endpoint yet" });
    }
    
    const position = {
        id: "demo_pos_" + nextPosId++,
        account_mode,
        broker: "BUNKER",
        symbol,
        side,
        quantity: capital / execution_price,
        entry_price: execution_price,
        current_mark_price: execution_price,
        unrealized_pnl: 0,
        realized_pnl: 0,
        status: "OPEN",
        opened_at: new Date().toISOString()
    };
    GLOBAL_POSITIONS.push(position);
    saveTrades();
    res.json({ message: "Trade executed successfully", position });
  });

  app.post("/api/trades/close", express.json(), async (req, res) => {
    console.log("--- Closing position request ---");
    const { position_id, account_mode, exit_price } = req.body;
    
    const pos = GLOBAL_POSITIONS.find(p => p.id === position_id && p.account_mode === account_mode);
    
    if (pos) {
        // Calculate realized PnL
        const quantity = pos.quantity;
        const entry_price = pos.entry_price;
        let realized_pnl = 0;
        
        if (pos.side.toUpperCase() === "BUY") {
            realized_pnl = (exit_price - entry_price) * quantity;
        } else {
            realized_pnl = (entry_price - exit_price) * quantity;
        }
        realized_pnl = parseFloat(realized_pnl.toFixed(2));

        pos.status = "CLOSED";
        pos.closed_at = new Date().toISOString();
        pos.realized_pnl = realized_pnl;
        saveTrades();

        const principal = quantity * entry_price;
        const totalReturn = principal + realized_pnl;

        // Account balance update
        if (pos.account_mode === "DEMO") {
            demoBalance += totalReturn;
            if (db) setDoc(doc(db, "system", "balances"), { demoBalance }, { merge: true }).catch(console.error);
        } else if (pos.account_mode === "LIVE") {
            liveBalance += totalReturn;
            if (db) setDoc(doc(db, "system", "balances"), { liveBalance }, { merge: true }).catch(console.error);
            console.log("LIVE trade closed, updated simulated liveBalance to:", liveBalance);
        }
        
        console.log("Position closed:", pos.id, "Realized PnL:", realized_pnl, "Principal:", principal, "Total Return:", totalReturn);
        res.json({
            status: "SUCCESS",
            message: `Position ${position_id} closed successfully.`,
            realized_pnl: realized_pnl
        });
    } else {
        console.log("Position NOT FOUND:", position_id, account_mode);
        res.status(404).json({ error: "Position not found" });
    }
  });

  app.get("/api/health/diagnostics", async (req, res) => {
      // Simulate pings to different services
      const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
      
      const checkService = async (name: string, shouldFail: boolean, latencyMs: number) => {
          const start = Date.now();
          await sleep(latencyMs);
          const latency = Date.now() - start;
          
          if (shouldFail) {
              return { name, status: "Offline", latency: null, error: `Connection refused to ${name} endpoint.` };
          }
          if (latency > 500) {
              return { name, status: "Degraded", latency, error: null };
          }
          return { name, status: "Connected", latency, error: null };
      };

      try {
          const results = await Promise.all([
              checkService("Neon PostgreSQL", false, 45 + Math.random() * 50),
              checkService("Exchange API (Binance)", false, 120 + Math.random() * 100),
              checkService("Price Feed (Finnhub)", false, 80 + Math.random() * 60),
          ]);
          res.json({ status: "SUCCESS", diagnostics: results });
      } catch (err: any) {
          res.status(500).json({ status: "ERROR", error: err.message });
      }
  });

  app.post("/api/ai/transcripts/ingest", express.json(), async (req, res) => {
      const { title, transcript_text } = req.body;
      const apiKey = process.env.NVIDIA_API_KEY;

      if (!apiKey) {
          return res.status(500).json({ status: "ERROR", message: "NVIDIA_API_KEY missing" });
      }

      const prompt = `
        You are an elite institutional trading knowledge architect.
        Extract clear, actionable trading rules and market conditions from this transcript:
        
        Title: ${title}
        Transcript Text:
        ${transcript_text}

        Return a structured JSON object containing:
        1. core_rules (list of concise entry/exit rules)
        2. risk_filters (conditions when NOT to trade)
        3. priority_setups (high-win-rate market patterns mentioned)
        `;

      try {
        const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "meta/llama-3.1-70b-instruct",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.1,
                response_format: { type: "json_object" }
            })
        });
        
        const data = await response.json();
        const extracted_knowledge = JSON.parse(data.choices[0].message.content);
        
        // Save to mock database (or actual DB in future)
        console.log("Extracted knowledge:", extracted_knowledge);
        
        res.json({
            status: "SUCCESS",
            title: title,
            rules: extracted_knowledge
        });
      } catch (e: any) {
          console.error("Failed to query NVIDIA NIM API:", e);
          res.status(500).json({ status: "FAILED", reason: e.message });
      }
  });


  // Phase 10: System Health & Audit Mocks
  let maintenanceMode = false;

  app.get("/api/system/health", (req, res) => {
      res.json({
          status: maintenanceMode ? "MAINTENANCE" : "HEALTHY",
          services: {
              database: { status: "ONLINE", latency: Math.floor(Math.random() * 15) + 5 },
              cache: { status: "ONLINE", latency: Math.floor(Math.random() * 5) + 1 },
              exchange_ws: { status: "ONLINE", latency: Math.floor(Math.random() * 40) + 20 },
              agent_worker: { status: agentState.status === "RUNNING" ? "ACTIVE" : "IDLE", latency: 0 }
          },
          system_metrics: {
              cpu_usage_pct: Math.floor(Math.random() * 30) + 10,
              ram_usage_mb: Math.floor(Math.random() * 500) + 200,
              uptime_seconds: Math.floor(process.uptime())
          }
      });
  });

  app.get("/api/system/audit-logs", (req, res) => {
      res.json({
          logs: [
              { id: 1001, timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(), level: "INFO", action: "USER_LOGIN", user: "admin", ip: "192.168.1.1", details: "Successful authentication" },
              { id: 1002, timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), level: "WARN", action: "RISK_PARAM_CHANGE", user: "operator", ip: "10.0.0.5", details: "Max drawdown increased to 5%" },
              { id: 1003, timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), level: "CRITICAL", action: "KILL_SWITCH_TEST", user: "admin", ip: "192.168.1.1", details: "Emergency system halt tested" },
              { id: 1004, timestamp: new Date(Date.now() - 1000 * 60 * 1440).toISOString(), level: "INFO", action: "API_KEY_ROTATION", user: "system", ip: "localhost", details: "Bybit API keys successfully rotated and encrypted" }
          ]
      });
  });

  app.post("/api/system/maintenance-mode", express.json(), (req, res) => {
      maintenanceMode = req.body.enabled;
      res.json({ status: "success", maintenanceMode });
  });

  let backtestReports: any[] = [];
  
  app.post("/api/backtest/run", express.json(), (req, res) => {
    const run_id = backtestReports.length + 1;
    const initial = req.body.initial_balance || 10000;
    const start_time = req.body.start_time || "2023-01-01T00:00:00Z";
    const end_time = req.body.end_time || "2023-12-31T23:59:59Z";
    const timeframe = req.body.timeframe || "1d";
    
    let stepMs = 86400000; // 1d default
    if (timeframe === "1m") stepMs = 60000;
    else if (timeframe === "5m") stepMs = 300000;
    else if (timeframe === "15m") stepMs = 900000;
    else if (timeframe === "1h") stepMs = 3600000;
    else if (timeframe === "4h") stepMs = 14400000;
    else if (timeframe === "1d") stepMs = 86400000;
    else if (timeframe === "1w") stepMs = 604800000;

    let equity_curve = [];
    const baseDate = new Date(start_time);
    const endDate = new Date(end_time);
    
    // limit points to max 500 for the mock
    const durationMs = endDate.getTime() - baseDate.getTime();
    const totalPoints = Math.min(500, Math.max(10, Math.floor(durationMs / stepMs)));
    
    // Seed random walk slightly differently based on symbol to make it look different
    const seed = req.body.symbol ? req.body.symbol.length : 1;

    for (let i = 0; i < totalPoints; i++) {
        let progress = i / totalPoints;
        let val = initial * (1 + (Math.sin(i * 0.2 * seed) * 0.05) + (progress * 0.15));
        const d = new Date(baseDate.getTime() + i * stepMs);
        if (d.getTime() > endDate.getTime()) break;
        
        equity_curve.push({
            time: d.toISOString(), 
            equity: val,
            drawdown: val < initial * 1.2 ? ((val - (initial * 1.2)) / (initial * 1.2)) * 100 : 0
        });
    }

    const report = {
        id: run_id,
        symbol: req.body.symbol,
        timeframe: req.body.timeframe,
        start_time: req.body.start_time,
        end_time: req.body.end_time,
        initial_balance: initial,
        final_balance: initial * 1.15,
        total_return_pct: 15.0,
        sharpe_ratio: 1.8,
        max_drawdown_pct: -4.2,
        win_rate_pct: 55.5,
        profit_factor: 1.4,
        strategy_config: req.body.strategy_config,
        created_at: new Date().toISOString(),
        equity_curve: equity_curve,
        trades: [
             {id: 1, symbol: req.body.symbol, side: "LONG", entry_price: 50000, exit_price: 52000, net_pnl: 200, entry_time: "2023-01-01T00:00:00Z", exit_time: "2023-01-02T00:00:00Z"},
             {id: 2, symbol: req.body.symbol, side: "SHORT", entry_price: 52000, exit_price: 51000, net_pnl: 100, entry_time: "2023-01-03T00:00:00Z", exit_time: "2023-01-04T00:00:00Z"},
        ]
    };
    backtestReports.push(report);
    res.json({ status: "success", report });
  });

  app.get("/api/backtest/reports", (req, res) => {
    const summaries = backtestReports.map(r => {
        const { equity_curve, trades, ...rest } = r;
        return rest;
    });
    res.json({ status: "success", reports: summaries });
  });

  app.get("/api/backtest/reports/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const report = backtestReports.find(r => r.id === id);
    if (report) {
        res.json({ status: "success", report });
    } else {
        res.status(404).json({ detail: "Report not found" });
    }
  });

  let chartSnapshots: any[] = [];

  app.post("/api/snapshots", express.json({limit: '10mb'}), (req, res) => {
      const { symbol, timeframe, image_data } = req.body;
      const snapshot = {
          id: chartSnapshots.length + 1,
          symbol,
          timeframe,
          image_data,
          timestamp: new Date().toISOString()
      };
      chartSnapshots.push(snapshot);
      res.json({ status: "success", snapshot });
  });




  app.get("/api/market/prices", async (req, res) => {
      res.json(GLOBAL_PRICES);
  });
  
  app.get("/api/snapshots", (req, res) => {
      res.json({ status: "success", snapshots: chartSnapshots });
  });

    app.get("/api/market/kline", async (req, res) => {
    try {
      const { category, symbol, interval, limit } = req.query;
      
      const isForex = typeof symbol === 'string' && ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'EURGBP'].includes(symbol);
      
      let parsedLimit = parseInt(limit as string) || 500;
      if (parsedLimit > 1000) parsedLimit = 1000;

if (isForex || category === 'stocks') {
          let finnhubSymbol = symbol;
          if (isForex) {
              finnhubSymbol = `OANDA:${symbol.substring(0,3)}_${symbol.substring(3)}`;
          }
          const polygonKey = process.env.POLYGON_API_KEY;
          const finnhubKey = process.env.FINNHUB_API_KEY;
          let multiplier = 1;
          let timespan = 'minute';
          let intervalMs = 60000;
          
          if (interval === "1") { multiplier = 1; timespan = 'minute'; intervalMs = 60000; }
          else if (interval === "3") { multiplier = 3; timespan = 'minute'; intervalMs = 180000; }
          else if (interval === "5") { multiplier = 5; timespan = 'minute'; intervalMs = 300000; }
          else if (interval === "15") { multiplier = 15; timespan = 'minute'; intervalMs = 900000; }
          else if (interval === "30") { multiplier = 30; timespan = 'minute'; intervalMs = 1800000; }
          else if (interval === "60") { multiplier = 1; timespan = 'hour'; intervalMs = 3600000; }
          else if (interval === "120") { multiplier = 2; timespan = 'hour'; intervalMs = 7200000; }
          else if (interval === "240") { multiplier = 4; timespan = 'hour'; intervalMs = 14400000; }
          else if (interval === "360") { multiplier = 6; timespan = 'hour'; intervalMs = 21600000; }
          else if (interval === "720") { multiplier = 12; timespan = 'hour'; intervalMs = 43200000; }
          else if (interval === "D") { multiplier = 1; timespan = 'day'; intervalMs = 86400000; }
          else if (interval === "M") { multiplier = 1; timespan = 'month'; intervalMs = 2592000000; }
          else if (interval === "W") { multiplier = 1; timespan = 'week'; intervalMs = 604800000; }
          else { multiplier = 1; timespan = 'minute'; intervalMs = 60000; }
          
// Try Finnhub for Stocks & Forex Klines
          if (finnhubKey) {
              let finnhubReso = '1';
              if (interval === "1") finnhubReso = '1';
              else if (interval === "5") finnhubReso = '5';
              else if (interval === "15") finnhubReso = '15';
              else if (interval === "30") finnhubReso = '30';
              else if (interval === "60") finnhubReso = '60';
              else if (interval === "D") finnhubReso = 'D';
              else if (interval === "W") finnhubReso = 'W';
              else if (interval === "M") finnhubReso = 'M';
              
              const to = Math.floor(Date.now() / 1000);
              const from = to - (intervalMs / 1000 * parsedLimit);
              
              const finnhubUrl = `https://finnhub.io/api/v1/stock/candle?symbol=${finnhubSymbol}&resolution=${finnhubReso}&from=${from}&to=${to}&token=${finnhubKey}`;
              const finnRes = await fetch(finnhubUrl);
              if (finnRes.ok) {
                  const data = await finnRes.json();
                  if (data.s === 'ok' && data.t && data.t.length > 0) {
                      const list = data.t.map((t: number, i: number) => [
                          (t * 1000).toString(),
                          data.o[i].toString(),
                          data.h[i].toString(),
                          data.l[i].toString(),
                          data.c[i].toString(),
                          data.v[i].toString(),
                          "1"
                      ]).reverse();
                      GLOBAL_PRICES[symbol as string] = data.c[data.c.length - 1];
                      return res.json({
                          retCode: 0,
                          retMsg: "OK",
                          result: { category: "linear", symbol, list },
                          retExtInfo: {},
                          time: Date.now()
                      });
                  }
              }
          }
          
          if (polygonKey && isForex) {
              const to = Date.now();
              const from = to - (intervalMs * parsedLimit * 2);
              const polygonUrl = `https://api.polygon.io/v2/aggs/ticker/C:${symbol}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=desc&limit=${parsedLimit}&apiKey=${polygonKey}`;
              
              const polygonRes = await fetch(polygonUrl);
              if (polygonRes.ok) {
                  const polygonData = await polygonRes.json();
                  if (polygonData.results && polygonData.results.length > 0) {
                      const list = polygonData.results.map((k: any) => [
                          k.t.toString(),
                          k.o.toString(),
                          k.h.toString(),
                          k.l.toString(),
                          k.c.toString(),
                          k.v.toString(),
                          (k.v * k.c).toString()
                      ]);
                      GLOBAL_PRICES[symbol] = polygonData.results[0].c;
                      return res.json({
                          retCode: 0,
                          retMsg: "OK",
                          result: { category: "linear", symbol, list },
                          retExtInfo: {},
                          time: Date.now()
                      });
                  }
              }
          }

          // Generate mock forex data
          if (interval === "1s") intervalMs = 1000;
          let currentPrice = GLOBAL_PRICES[symbol as string] || 1.1370; // Use cache or fallback
          
          const list = [];
          const now = Math.floor(Date.now() / intervalMs) * intervalMs;
          for (let i = 0; i < parsedLimit; i++) {
              const time = now - (i * intervalMs);
              const close = currentPrice;
              const high = close + (Math.random() * 0.0010);
              const low = close - (Math.random() * 0.0010);
              const open = low + (Math.random() * (high - low));
              currentPrice = open;
              list.push([time.toString(), open.toFixed(5), high.toFixed(5), low.toFixed(5), close.toFixed(5), "1000", "100000"]);
          }
          
          return res.json({
              retCode: 0,
              retMsg: "OK",
              result: { category: "linear", symbol, list },
              retExtInfo: {},
              time: now
          });
      }

      // Non-Forex (Crypto) -> Map Bybit intervals to Binance intervals
      const intervalMap: Record<string, string> = {
          "1s": "1s",
          "1": "1m",
          "3": "3m",
          "5": "5m",
          "15": "15m",
          "30": "30m",
          "60": "1h",
          "120": "2h",
          "240": "4h",
          "360": "6h",
          "720": "12h",
          "D": "1d",
          "W": "1w",
          "M": "1M"
      };
      
      const binanceInterval = intervalMap[interval as string] || "1m";
      const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${binanceInterval}&limit=${parsedLimit}`;
      const binanceRes = await fetch(binanceUrl);
      
      if (binanceRes.ok) {
          const binanceData = await binanceRes.json();
          // Binance returns oldest to newest. Bybit returns newest to oldest.
          const list = binanceData.map((k: any) => [
              k[0].toString(), // open time
              k[1], // open
              k[2], // high
              k[3], // low
              k[4], // close
              k[5], // volume
              k[7]  // quote asset volume / turnover
          ]).reverse();
          
          return res.json({
              retCode: 0,
              retMsg: "OK",
              result: { category: category || 'spot', symbol, list },
              retExtInfo: {},
              time: Date.now()
          });
      } else {
          throw new Error("Binance API fetch failed: " + binanceRes.status);
      }
    } catch (error: any) {
      console.log("KLine fetch error, falling back to mock data:", error.message || error);
      
      // Fallback to mock data for crypto too
      const { symbol, interval, limit } = req.query;
      const parsedLimit = parseInt(limit as string) || 500;
      let intervalMs = 60000;
      if (interval === "5") intervalMs = 300000;
      if (interval === "15") intervalMs = 900000;
      if (interval === "60") intervalMs = 3600000;
      if (interval === "D") intervalMs = 86400000;
      
      let currentPrice = GLOBAL_PRICES[symbol as string] || 50000;
      const list = [];
      const now = Math.floor(Date.now() / intervalMs) * intervalMs;
      for (let i = 0; i < parsedLimit; i++) {
          const time = now - (i * intervalMs);
          const close = currentPrice;
          const high = close + (Math.random() * 50);
          const low = close - (Math.random() * 50);
          const open = low + (Math.random() * (high - low));
          currentPrice = open;
          list.push([time.toString(), open.toFixed(2), high.toFixed(2), low.toFixed(2), close.toFixed(2), "1", "50000"]);
      }
      
      return res.json({
          retCode: 0,
          retMsg: "OK",
          result: { category: "spot", symbol, list },
          retExtInfo: {},
          time: Date.now()
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Auto-Trading Engine
  // --- Start Position Management Engine ---
  const managePositionsEngine = async () => {
      try {
          // Use GLOBAL_PRICES directly so forex and crypto are supported identically
          const priceMap = GLOBAL_PRICES;

          GLOBAL_POSITIONS.forEach(pos => {
              if (pos.status === "OPEN") {
                  let currentPrice = priceMap[pos.symbol];
                  
                  // if not in global prices, we might need a fallback, but updatePrices should have it
                  if (currentPrice) {
                      pos.current_mark_price = currentPrice;
                      
                      const pnl = pos.side === 'BUY' 
                          ? (currentPrice - pos.entry_price) * pos.quantity 
                          : (pos.entry_price - currentPrice) * pos.quantity;
                      pos.unrealized_pnl = +(pnl).toFixed(2);

                      let shouldClose = false;
                      let closeReason = "";

                      // Check TP
                      if (pos.take_profit) {
                          const hitTp = pos.side === "BUY" ? currentPrice >= pos.take_profit : currentPrice <= pos.take_profit;
                          if (hitTp) {
                              shouldClose = true;
                              closeReason = "TP";
                          }
                      }

                      // Check SL
                      if (pos.stop_loss && !shouldClose) {
                          const hitSl = pos.side === "BUY" ? currentPrice <= pos.stop_loss : currentPrice >= pos.stop_loss;
                          if (hitSl) {
                              shouldClose = true;
                              closeReason = "SL";
                          }
                      }

                      // Check AutoTrade Profit Threshold (only if auto trade active and pos is LIVE)
                      if (!shouldClose && riskSettings.autoTrade.active && pos.account_mode === "LIVE") {
                           if (pnl >= riskSettings.autoTrade.min_profit_threshold) {
                               shouldClose = true;
                               closeReason = "AutoTrade Profit Threshold";
                           }
                      }

                      if (shouldClose) {
                          console.log(`System: Closing position ${pos.id} for ${pos.symbol} due to ${closeReason}. PnL: ${pnl}`);
                          pos.status = "CLOSED";
                          pos.closed_at = new Date().toISOString();
                          pos.realized_pnl = parseFloat(pnl.toFixed(2));
                          if (pos.account_mode === "LIVE") {
                              liveBalance += pos.realized_pnl;
                          } else {
                              demoBalance += pos.realized_pnl;
                          }
                          
                          if (db) {
                              const updateData = pos.account_mode === "LIVE" ? { liveBalance } : { demoBalance };
                              setDoc(doc(db, "system", "balances"), updateData, { merge: true }).catch(console.error);
                          }
                          saveTrades();
                      }
                  }
              }
          });
      } catch (e) {
          console.error("Position management engine error:", e);
      }
  };

  setInterval(managePositionsEngine, 3000);

  const runAutoTrade = async () => {
      if (agentState.status !== "RUNNING") return;
      
      agentState.current_activity = "SEARCHING";
      
      // Add random search delay: 5s to 1min
      const delay = Math.floor(Math.random() * (60000 - 5000 + 1) + 5000);
      console.log(`Auto-trading: Searching for trades (delay: ${delay}ms)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      if (agentState.status !== "RUNNING") return; // Re-check after delay
      
      console.log("Auto-trade engine loop active...");
      const apiKey = process.env.NVIDIA_API_KEY;

      const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
      
      try {
          // Use GLOBAL_PRICES
          const prices = GLOBAL_PRICES;

          // Scan for new trades
          const symbol = symbols[Math.floor(Math.random() * symbols.length)];
          const hasOpenPos = GLOBAL_POSITIONS.some(p => p.symbol === symbol && p.status === "OPEN" && p.account_mode === "LIVE");
          
          if (!hasOpenPos && apiKey && prices[symbol]) {
              agentState.current_activity = "ANALYZING";
              // 1. Fetch Finnhub sentiment
              const newsRes = await fetch(`http://localhost:${PORT}/api/ai/finnhub-news`);
              const news = await newsRes.json();
              const newsSentiment = news.length > 0 ? 0.5 : 0; // Simplified sentiment

              // 2. Ask NVIDIA AI
              console.log(`Auto-trading: Asking NVIDIA AI about ${symbol}`);
              const aiRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
                  method: "POST",
                  headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${apiKey}`
                  },
                  body: JSON.stringify({
                      model: "meta/llama-3.1-70b-instruct",
                      messages: [{
                          role: "user",
                          content: `The current price of ${symbol} is ${prices[symbol]}. News Sentiment: ${newsSentiment}. Should I BUY or SELL for a quick scalp trade? Respond with a JSON object like {"action": "BUY", "confidence": 90} or {"action": "HOLD", "confidence": 0}.`
                      }],
                      max_tokens: 100,
                      temperature: 0.2
                  })
              });

              if (aiRes.ok) {
                  const data = await aiRes.json();
                  const reply = data.choices[0].message.content;
                  let decision: any = { action: "HOLD" };
                  try {
                      // Extract JSON if it's wrapped in text
                      const match = reply.match(/\{.*\}/s);
                      if (match) {
                          decision = JSON.parse(match[0]);
                      }
                  } catch (e) {
                      console.error("Failed to parse NVIDIA AI response:", reply);
                  }

                  if ((decision.action === "BUY" || decision.action === "SELL") && decision.confidence > 70) {
                      agentState.current_activity = "EXECUTING";
                      const entryPrice = prices[symbol];
                      
                      const tradeAmount = riskSettings.default_trade_amount;
                      if (tradeAmount > liveBalance) {
                          console.warn("Trade amount exceeds live balance, skipping trade.");
                          agentState.current_activity = "SEARCHING";
                          setTimeout(runAutoTrade, 5000);
                          return;
                      }

                      console.log(`Auto-trading: Placing ${decision.action} order for ${symbol} at ${entryPrice} with amount $${tradeAmount}`);
                      
                      const position = {
                          id: `live_pos_${nextPosId++}`,
                          account_mode: "LIVE",
                          broker: "BINANCE",
                          symbol: symbol,
                          side: decision.action,
                          quantity: tradeAmount / entryPrice,
                          entry_price: entryPrice,
                          current_mark_price: entryPrice,
                          stop_loss: decision.action === "BUY" 
                              ? entryPrice * (1 - riskSettings.autoTrade.sl_threshold_pct)
                              : entryPrice * (1 + riskSettings.autoTrade.sl_threshold_pct),
                          take_profit: decision.action === "BUY"
                              ? entryPrice * (1 + riskSettings.autoTrade.tp_threshold_pct)
                              : entryPrice * (1 - riskSettings.autoTrade.tp_threshold_pct),
                          unrealized_pnl: 0.00,
                          ai_confidence_score: decision.confidence,
                          status: "OPEN",
                          opened_at: new Date().toISOString()
                      };
                      GLOBAL_POSITIONS.push(position); 
                      saveTrades();
                  }
              } else {
                  console.error("NVIDIA API error:", await aiRes.text());
              }
          }
      } catch (err) {
          console.error("Auto-trade engine error:", err);
      }
      agentState.current_activity = "SEARCHING";
      setTimeout(runAutoTrade, 5000); // Wait 5s before next loop
  };

  runAutoTrade();

  // Vite middleware for development and static serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

export const initPromise = startServer();
export default app;
