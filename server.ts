import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Routes
  
  let demoBalance = 10000;

  // Bybit V5 Live Wallet Balance Service
  const BYBIT_API_KEY = process.env.BYBIT_API_KEY || "";
  const BYBIT_API_SECRET = process.env.BYBIT_API_SECRET || "";
  const BYBIT_BASE_URL = "https://api.bybit.com"; // Use "https://api-testnet.bybit.com" for Testnet
  
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

      // Live Bybit Capital Engine
      let live_data = { total_equity: 0.0, available_balance: 0.0, currency: "USDT", status: "UNCONFIGURED" };
      
      if (BYBIT_API_KEY && BYBIT_API_SECRET) {
          try {
              console.log("Fetching Bybit balances...");
              // ... (rest of the code)
              const endpoint = "/v5/account/wallet-balance";
              const recvWindow = "5000";
              const timestamp = Date.now().toString();
              const paramsStr = "accountType=UNIFIED";
              
              const rawPayload = timestamp + BYBIT_API_KEY + recvWindow + paramsStr;
              const signature = crypto.createHmac("sha256", BYBIT_API_SECRET).update(rawPayload).digest("hex");
              
              const url = `${BYBIT_BASE_URL}${endpoint}?${paramsStr}`;
              const response = await fetch(url, {
                  headers: {
                      "X-BAPI-API-KEY": BYBIT_API_KEY,
                      "X-BAPI-SIGN": signature,
                      "X-BAPI-TIMESTAMP": timestamp,
                      "X-BAPI-RECV-WINDOW": recvWindow
                  }
              });
              
              if (response.ok) {
                  const data = await response.json();
                  if (data.retCode === 0 && data.result.list.length > 0) {
                      const accountInfo = data.result.list[0];
                      const total_equity = parseFloat(accountInfo.totalEquity || "0");
                      const wallet_balance = parseFloat(accountInfo.totalWalletBalance || "0");
                      const available_balance = parseFloat(accountInfo.totalAvailableBalance || wallet_balance.toString());
                      
                      live_data = {
                          total_equity: parseFloat(total_equity.toFixed(2)),
                          available_balance: parseFloat(available_balance.toFixed(2)),
                          currency: "USDT",
                          status: "ONLINE"
                      };
                  } else {
                      console.log("Bybit response error:", data);
                      live_data.status = "ERROR";
                  }
              } else {
                  const errText = await response.text();
                  if (response.status === 403 && errText.includes("CloudFront")) {
                      console.log("Bybit API access blocked by CloudFront (Expected on this platform IPs). Live wallet will remain offline.");
                  } else {
                      console.log("Bybit fetch failed, status:", response.status, "url:", url);
                  }
                  live_data.status = "OFFLINE";
              }
          } catch (e: any) {
              console.log("Bybit Wallet Error:", e.message || e);
              live_data.status = "OFFLINE";
          }
      }

      console.log("Sending balances response...");
      res.json({
          demo: demo_data,
          bybit_live: live_data
      });
  });

  app.post("/api/account/balance/reset", (req, res) => {
    demoBalance = 10000;
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
    default_risk_pct: 0.01
  };

  app.get("/api/risk/settings", (req, res) => {
    res.json(riskSettings);
  });

  app.post("/api/risk/settings", express.json(), (req, res) => {
    riskSettings = { ...riskSettings, ...req.body };
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
  let positions: any[] = [];
  let nextOrderId = 1;
  let GLOBAL_POSITIONS: any[] = [];
  let nextPosId = 1;
  
  const DB_FILE = path.join(process.cwd(), 'trades_db.json');
  if (fs.existsSync(DB_FILE)) {
      try {
          const data = fs.readFileSync(DB_FILE, 'utf-8');
          GLOBAL_POSITIONS = JSON.parse(data);
          nextPosId = GLOBAL_POSITIONS.length + 1;
      } catch(e) {}
  }

  const saveTrades = () => {
      fs.writeFileSync(DB_FILE, JSON.stringify(GLOBAL_POSITIONS, null, 2));
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

  // Unified Trades Synchronization Engine, NVIDIA AI Inference & Finnhub News Pipeline
  app.get("/api/ai/finnhub-news", async (req, res) => {
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
  const DEMO_ACCOUNT_STATE = {
    balance: 10000.00,
    currency: "USDT",
    equity: 10000.00,
    open_positions: GLOBAL_POSITIONS
  };

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
    res.json(DEMO_ACCOUNT_STATE);
  });

  app.post("/api/agent-workspace/demo/place-order", express.json(), (req, res) => {
    const order = req.body;
    const entry = order.price || 142.50; // Fallback if price missing
    const position = {
        id: `demo_pos_${nextPosId++}`,
        account_mode: "DEMO",
        broker: "CTRADER",
        symbol: order.symbol,
        side: order.side,
        quantity: order.qty,
        entry_price: entry,
        current_mark_price: entry,
        stop_loss: order.stop_loss,
        take_profit: order.take_profit,
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
        price: 142.50,
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
            entry_price: 142.50,
            mark_price: 142.50,
            unrealized_pnl: 0.00
        });
    }

    res.json({ status: "SUCCESS", message: `Demo ${order.side} order placed for ${order.symbol}`, position });
  });
  
  app.post("/api/agent-workspace/live/place-order", express.json(), (req, res) => {
    const order = req.body;
    const entry = order.price || 142.50; // Fallback if price missing
    const position = {
        id: `live_pos_${nextPosId++}`,
        account_mode: "LIVE",
        broker: "BYBIT",
        symbol: order.symbol,
        side: order.side,
        quantity: order.qty,
        entry_price: entry,
        current_mark_price: entry,
        stop_loss: order.stop_loss,
        take_profit: order.take_profit,
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
        price: 142.50,
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
            entry_price: 142.50,
            mark_price: 142.50,
            unrealized_pnl: 0.00
        });
    }

    res.json({ status: "SUCCESS", message: `Live ${order.side} order placed for ${order.symbol}`, position });
  });
  
  app.get("/api/trades/active", (req, res) => {
    console.log("Fetching active trades, query:", req.query);
    const mode = req.query.account_mode;
    
    // Simulate price movement
    GLOBAL_POSITIONS.forEach(p => {
        if (p.status === "OPEN") {
            const movement = (Math.random() - 0.5) * 2;
            p.current_mark_price = +(p.current_mark_price + movement).toFixed(2);
            const diff = p.side === 'BUY' ? p.current_mark_price - p.entry_price : p.entry_price - p.current_mark_price;
            p.unrealized_pnl = +(diff * p.quantity).toFixed(2);
        }
    });

    let active = GLOBAL_POSITIONS.filter(p => p.status === "OPEN");
    if (mode && mode !== "ALL") {
        active = active.filter(p => p.account_mode === mode);
    }
    console.log("Found active positions:", active.length);
    res.json(active);
  });

  app.delete("/api/trades/close", express.json(), (req, res) => {
    console.log("--- Closing position request ---");
    console.log("Body:", req.body);
    console.log("GLOBAL_POSITIONS length:", GLOBAL_POSITIONS.length);
    const { position_id, account_mode } = req.body;
    console.log("Looking for:", position_id, account_mode);
    const pos = GLOBAL_POSITIONS.find(p => {
        console.log("Checking:", p.id, p.account_mode);
        return p.id === position_id && p.account_mode === account_mode
    });
    if (pos) {
        console.log("Found position to close:", pos.id);
        pos.status = "CLOSED"; saveTrades();
        pos.closed_at = new Date().toISOString();
        if (pos.account_mode === "DEMO") {
          demoBalance += pos.unrealized_pnl;
        }
        console.log("Position closed:", pos.id);
        res.json({
            status: "SUCCESS",
            message: `Position ${position_id} closed successfully.`,
            realized_pnl: pos.unrealized_pnl
        });
    } else {
        console.log("Position NOT FOUND:", position_id, account_mode);
        res.status(404).json({ error: "Position not found" });
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

  app.get("/api/snapshots", (req, res) => {
      res.json({ status: "success", snapshots: chartSnapshots });
  });

  app.get("/api/bybit/v5/market/kline", async (req, res) => {
    try {
      const { category, symbol, interval, limit } = req.query;
      
      const isForex = typeof symbol === 'string' && ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'EURGBP'].includes(symbol);
      
      if (isForex) {
          // Generate mock forex data
          const parsedLimit = parseInt(limit as string) || 500;
          let intervalMs = 60000;
          if (interval === "5") intervalMs = 300000;
          if (interval === "15") intervalMs = 900000;
          if (interval === "60") intervalMs = 3600000;
          if (interval === "D") intervalMs = 86400000;
          
          let currentPrice = 1.1000; // Mock EURUSD base
          if (symbol === 'GBPUSD') currentPrice = 1.2500;
          if (symbol === 'USDJPY') currentPrice = 150.00;
          
          const list = [];
          const now = Math.floor(Date.now() / intervalMs) * intervalMs;
          for (let i = parsedLimit - 1; i >= 0; i--) {
              const time = now - (i * intervalMs);
              const open = currentPrice;
              const high = currentPrice + (Math.random() * 0.0010);
              const low = currentPrice - (Math.random() * 0.0010);
              const close = low + (Math.random() * (high - low));
              currentPrice = close;
              list.push([time.toString(), open.toFixed(5), high.toFixed(5), low.toFixed(5), close.toFixed(5), "1000", "100000"]);
          }
          // Sort reverse chronologically as Bybit does
          list.reverse();
          
          return res.json({
              retCode: 0,
              retMsg: "OK",
              result: { category: "linear", symbol, list },
              retExtInfo: {},
              time: now
          });
      }

      const BYBIT_API_KEY = process.env.BYBIT_API_KEY;
      const BYBIT_API_SECRET = process.env.BYBIT_API_SECRET;
      const BYBIT_BASE_URL = "https://api.bybit.com"; // Use "https://api-testnet.bybit.com" for Testnet
      
      const endpoint = "/v5/market/kline";
      const paramsObj = {
          category: String(category || 'spot'),
          interval: String(interval || 1),
          limit: String(limit || 500),
          symbol: String(symbol)
      };
      const paramsStr = Object.keys(paramsObj)
          .sort()
          // @ts-ignore
          .map(key => `${key}=${paramsObj[key]}`)
          .join('&');
      
      const url = `${BYBIT_BASE_URL}${endpoint}?${paramsStr}`;
      
      let headers: any = {};
      if (BYBIT_API_KEY && BYBIT_API_SECRET) {
          const recvWindow = "5000";
          const timestamp = Date.now().toString();
          const rawPayload = timestamp + BYBIT_API_KEY + recvWindow + paramsStr;
          const signature = crypto.createHmac("sha256", BYBIT_API_SECRET).update(rawPayload).digest("hex");
          headers = {
              "X-BAPI-API-KEY": BYBIT_API_KEY,
              "X-BAPI-SIGN": signature,
              "X-BAPI-TIMESTAMP": timestamp,
              "X-BAPI-RECV-WINDOW": recvWindow
          };
      }
      
      const bybitRes = await fetch(url, { headers });
      if (!bybitRes.ok) {
          const errText = await bybitRes.text();
          if (bybitRes.status === 403 && errText.includes("CloudFront")) {
              throw new Error("CloudFront Blocked");
          }
          throw new Error(`Bybit HTTP error ${bybitRes.status}`);
      }
      const text = await bybitRes.text();
      try {
          const bybitData = JSON.parse(text);
          return res.json(bybitData);
      } catch (e) {
          throw new Error("Invalid JSON from Bybit");
      }
    } catch (error: any) {
      if (error.message !== "CloudFront Blocked") {
          console.log("Bybit KLine proxy error, falling back to mock data:", error.message || error);
      }
      // Fallback to mock data for crypto too
      const { symbol, interval, limit } = req.query;
      const parsedLimit = parseInt(limit as string) || 500;
      let intervalMs = 60000;
      if (interval === "5") intervalMs = 300000;
      if (interval === "15") intervalMs = 900000;
      if (interval === "60") intervalMs = 3600000;
      if (interval === "D") intervalMs = 86400000;
      
      let currentPrice = 65000.00;
      if (typeof symbol === 'string') {
          if (symbol.includes("ETH")) currentPrice = 3500.00;
          if (symbol.includes("SOL")) currentPrice = 140.00;
      }
      
      const list = [];
      const now = Math.floor(Date.now() / intervalMs) * intervalMs;
      for (let i = parsedLimit - 1; i >= 0; i--) {
          const time = now - (i * intervalMs);
          const open = currentPrice;
          const high = currentPrice + (Math.random() * currentPrice * 0.001);
          const low = currentPrice - (Math.random() * currentPrice * 0.001);
          const close = low + (Math.random() * (high - low));
          currentPrice = close;
          list.push([time.toString(), open.toFixed(2), high.toFixed(2), low.toFixed(2), close.toFixed(2), "100", "1000000"]);
      }
      list.reverse();
      
      res.json({
          retCode: 0,
          retMsg: "OK (MOCK FALLBACK)",
          result: { category: req.query.category || "linear", symbol, list },
          retExtInfo: {},
          time: now
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
