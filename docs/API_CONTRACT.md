# OBSIDIAN TRADING SYSTEM V2 — PRODUCTION API CONTRACT

This document provides the formal API contract for every production endpoint in the Obsidian Trading System.

---

## 1. Account & Balance Endpoints

### 1.1 GET `/api/account/balances`
- **HTTP Method**: `GET`
- **URL**: `/api/account/balances`
- **Authentication**: None (Public/Internal)
- **Request Parameters**: None
- **Request Body**: None
- **Response Schema**:
  ```json
  {
    "demo": 10000.00,
    "live": 5420.50,
    "crypto": 1.24500000,
    "currency": "USD"
  }
  ```
- **Error Schema**:
  ```json
  { "error": "string" }
  ```
- **External Dependencies**: None
- **Database Dependencies**: None (In-memory state)
- **Frontend Consumers**: `TopNavbar.tsx`, `OverviewDashboard.tsx`

---

### 1.2 POST `/api/account/balance/reset`
- **HTTP Method**: `POST`
- **URL**: `/api/account/balance/reset`
- **Authentication**: None
- **Request Parameters**: None
- **Request Body**: None
- **Response Schema**:
  ```json
  {
    "success": true,
    "balance": 10000.00,
    "message": "Demo balance reset to $10,000"
  }
  ```
- **Error Schema**:
  ```json
  { "error": "string" }
  ```
- **External Dependencies**: None
- **Database Dependencies**: None (In-memory state)
- **Frontend Consumers**: `OverviewDashboard.tsx`

---

## 2. Market Data Endpoints

### 2.1 GET `/api/market/prices`
- **HTTP Method**: `GET`
- **URL**: `/api/market/prices`
- **Authentication**: None
- **Request Parameters**: None
- **Request Body**: None
- **Response Schema**:
  ```json
  {
    "BTCUSDT": 64250.00,
    "ETHUSDT": 1925.00,
    "EURUSD": 1.1548,
    "AAPL": 224.50
  }
  ```
- **Error Schema**:
  ```json
  { "error": "Failed to fetch market prices" }
  ```
- **External Dependencies**: Binance API, Finnhub API, Yahoo Finance API
- **Database Dependencies**: None
- **Frontend Consumers**: `useRealtimeData.ts`, `nvidia_trader.ts`, `MarketTicker.tsx`

---

### 2.2 GET `/api/market/kline`
- **HTTP Method**: `GET`
- **URL**: `/api/market/kline`
- **Authentication**: None
- **Request Parameters**:
  - `symbol` (query, string, required, e.g., `BTCUSDT`, `EURUSD`, `AAPL`)
  - `interval` or `timeframe` (query, string, optional, default: `15m`)
  - `limit` (query, number, optional, default: `100`)
- **Request Body**: None
- **Response Schema**:
  ```json
  [
    {
      "timestamp": 1720000000000,
      "open": 64000.0,
      "high": 64300.0,
      "low": 63900.0,
      "close": 64250.0,
      "volume": 120.5
    }
  ]
  ```
- **Error Schema**:
  ```json
  { "error": "Invalid or missing symbol parameter" }
  ```
- **External Dependencies**: Binance API, Yahoo Finance API
- **Database Dependencies**: None
- **Frontend Consumers**: `InteractiveChartsWorkspace.tsx`, `ChartHistory.tsx`

---

## 3. Signal Scanning & Pocket Option Endpoints

### 3.1 GET `/api/pocket-option/signals`
- **HTTP Method**: `GET`
- **URL**: `/api/pocket-option/signals`
- **Authentication**: None
- **Request Parameters**:
  - `timeframe` (query, string, optional, e.g., `1m`, `5m`, `15m`)
- **Request Body**: None
- **Response Schema**:
  ```json
  [
    {
      "id": "POCKET-1092",
      "symbol": "EUR/USD",
      "direction": "CALL",
      "timeframe": "1m",
      "winRate": "92%",
      "confidence": "HIGH",
      "entryPrice": 1.1548,
      "strategy": "SMC Confluence",
      "createdAt": "2026-08-11T10:00:00Z"
    }
  ]
  ```
- **Error Schema**:
  ```json
  { "error": "Failed to fetch signals" }
  ```
- **External Dependencies**: ExchangeRate API, Binance API
- **Database Dependencies**: Firestore (`pocket_settings` collection)
- **Frontend Consumers**: `PocketSignalsWorkspace.tsx`

---

### 3.2 POST `/api/pocket-option/generate-signal`
- **HTTP Method**: `POST`
- **URL**: `/api/pocket-option/generate-signal`
- **Authentication**: None
- **Request Parameters**: None
- **Request Body**:
  ```json
  {
    "symbol": "EUR/USD",
    "timeframe": "5m",
    "strategies": ["SMC Confluence", "Trend Breakout"]
  }
  ```
- **Response Schema**:
  ```json
  {
    "id": "POCKET-5021",
    "symbol": "EUR/USD",
    "direction": "CALL",
    "timeframe": "5m",
    "entryPrice": 1.1548,
    "winRateScore": 92,
    "strategy": "SMC Confluence",
    "status": "ACTIVE",
    "createdAt": 1720000000000
  }
  ```
- **Error Schema**:
  ```json
  { "error": "Invalid pair or market data unavailable" }
  ```
- **External Dependencies**: Binance API, Finnhub API
- **Database Dependencies**: Firestore (`trades` collection)
- **Frontend Consumers**: `PocketSignalsWorkspace.tsx`

---

### 3.3 GET `/api/agent-workspace/scan`
- **HTTP Method**: `GET`
- **URL**: `/api/agent-workspace/scan`
- **Authentication**: None
- **Request Parameters**:
  - `category` (query, string, optional, e.g., `ALL`, `FOREX`, `CRYPTO`, `STOCKS`)
- **Request Body**: None
- **Response Schema**:
  ```json
  [
    {
      "symbol": "EUR/USD",
      "category": "FOREX",
      "price": 1.1548,
      "direction": "BUY",
      "score": 92,
      "status": "READY"
    }
  ]
  ```
- **Error Schema**:
  ```json
  { "error": "Scan failed" }
  ```
- **External Dependencies**: Binance API, Finnhub API
- **Database Dependencies**: None
- **Frontend Consumers**: `PocketSignalsWorkspace.tsx`

---

## 4. Trade Management Endpoints

### 4.1 GET `/api/trades/active`
- **HTTP Method**: `GET`
- **URL**: `/api/trades/active`
- **Authentication**: None
- **Request Parameters**: None
- **Request Body**: None
- **Response Schema**:
  ```json
  [
    {
      "id": "SIG-1092",
      "symbol": "EUR/USD",
      "direction": "CALL",
      "expiry": "1m",
      "entryPrice": 1.1548,
      "currentPrice": 1.1550,
      "payoutPct": 92,
      "status": "ACTIVE",
      "timestamp": "1720000000000"
    }
  ]
  ```
- **Error Schema**:
  ```json
  { "error": "Failed to load active trades" }
  ```
- **External Dependencies**: None
- **Database Dependencies**: Firestore (`trades` collection with `status == "ACTIVE"`)
- **Frontend Consumers**: `TradesManagementPage.tsx`, `useTradeState.ts`

---

### 4.2 GET `/api/trades/closed`
- **HTTP Method**: `GET`
- **URL**: `/api/trades/closed`
- **Authentication**: None
- **Request Parameters**:
  - `limit` (query, number, optional, default: `50`)
- **Request Body**: None
- **Response Schema**:
  ```json
  [
    {
      "id": "SIG-1080",
      "symbol": "BTC/USDT",
      "direction": "CALL",
      "expiry": "5m",
      "entryPrice": 64100.0,
      "exitPrice": 64250.0,
      "result": "WIN",
      "payoutPct": 85,
      "winRateScore": 94,
      "timestamp": "10 mins ago"
    }
  ]
  ```
- **Error Schema**:
  ```json
  { "error": "Failed to load trade history" }
  ```
- **External Dependencies**: None
- **Database Dependencies**: Firestore (`trades` collection with `status != "ACTIVE"`)
- **Frontend Consumers**: `TradesManagementPage.tsx`, `ClosedTrades.tsx`, `useTradeState.ts`

---

### 4.3 POST `/api/trades/execute`
- **HTTP Method**: `POST`
- **URL**: `/api/trades/execute`
- **Authentication**: None
- **Request Parameters**: None
- **Request Body**:
  ```json
  {
    "symbol": "EUR/USD",
    "direction": "CALL",
    "expiry": "5m",
    "amount": 100,
    "entryPrice": 1.1548,
    "strategy": "SMC Confluence"
  }
  ```
- **Response Schema**:
  ```json
  {
    "success": true,
    "trade": {
      "id": "SIG-9012",
      "symbol": "EUR/USD",
      "direction": "CALL",
      "expiry": "5m",
      "entryPrice": 1.1548,
      "amount": 100,
      "status": "ACTIVE",
      "timestamp": 1720000000000
    }
  }
  ```
- **Error Schema**:
  ```json
  { "error": "Trade execution parameter missing" }
  ```
- **External Dependencies**: None
- **Database Dependencies**: Firestore (`trades` collection)
- **Frontend Consumers**: `QuickOrderPanel.tsx`, `TradesManagementPage.tsx`

---

### 4.4 POST `/api/trades/close`
- **HTTP Method**: `POST`
- **URL**: `/api/trades/close`
- **Authentication**: None
- **Request Parameters**: None
- **Request Body**:
  ```json
  {
    "tradeId": "SIG-9012",
    "exitPrice": 1.1552
  }
  ```
- **Response Schema**:
  ```json
  {
    "success": true,
    "tradeId": "SIG-9012",
    "result": "WIN",
    "payout": 192.00
  }
  ```
- **Error Schema**:
  ```json
  { "error": "Trade not found" }
  ```
- **External Dependencies**: None
- **Database Dependencies**: Firestore (`trades` collection)
- **Frontend Consumers**: `TradesManagementPage.tsx`

---

## 5. Risk Management Endpoints

### 5.1 GET `/api/risk/settings`
- **HTTP Method**: `GET`
- **URL**: `/api/risk/settings`
- **Authentication**: None
- **Request Parameters**: None
- **Request Body**: None
- **Response Schema**:
  ```json
  {
    "maxRiskPerTradePct": 2.0,
    "maxDailyDrawdownPct": 5.0,
    "maxOpenPositions": 5,
    "stopLossATRMultiplier": 1.5,
    "takeProfitATRMultiplier": 2.5,
    "minWinRateThreshold": 85,
    "killSwitchActive": false
  }
  ```
- **Error Schema**:
  ```json
  { "error": "Failed to load risk settings" }
  ```
- **External Dependencies**: None
- **Database Dependencies**: None (In-memory store)
- **Frontend Consumers**: `RiskSettings.tsx`, `RiskDashboard.tsx`

---

### 5.2 POST `/api/risk/settings`
- **HTTP Method**: `POST`
- **URL**: `/api/risk/settings`
- **Authentication**: None
- **Request Parameters**: None
- **Request Body**:
  ```json
  {
    "maxRiskPerTradePct": 2.5,
    "maxDailyDrawdownPct": 4.0,
    "maxOpenPositions": 3
  }
  ```
- **Response Schema**:
  ```json
  {
    "success": true,
    "settings": {
      "maxRiskPerTradePct": 2.5,
      "maxDailyDrawdownPct": 4.0,
      "maxOpenPositions": 3
    }
  }
  ```
- **Error Schema**:
  ```json
  { "error": "Invalid risk parameter bounds" }
  ```
- **External Dependencies**: None
- **Database Dependencies**: None (In-memory store)
- **Frontend Consumers**: `RiskSettings.tsx`

---

### 5.3 GET `/api/risk/metrics`
- **HTTP Method**: `GET`
- **URL**: `/api/risk/metrics`
- **Authentication**: None
- **Request Parameters**: None
- **Request Body**: None
- **Response Schema**:
  ```json
  {
    "totalExposure": 2500.00,
    "dailyPnL": 340.50,
    "valueAtRisk95": 180.20,
    "openPositionsCount": 2,
    "dailyDrawdownPct": 1.2
  }
  ```
- **Error Schema**:
  ```json
  { "error": "Failed to calculate risk metrics" }
  ```
- **External Dependencies**: None
- **Database Dependencies**: Firestore (`trades` collection)
- **Frontend Consumers**: `RiskDashboard.tsx`

---

## 6. Backtest & Strategy Sweep Endpoints

### 6.1 POST `/api/backtest/run`
- **HTTP Method**: `POST`
- **URL**: `/api/backtest/run`
- **Authentication**: None
- **Request Parameters**: None
- **Request Body**:
  ```json
  {
    "symbol": "BTCUSDT",
    "timeframe": "15m",
    "strategy": "SMC Confluence",
    "initialCapital": 10000,
    "riskPerTrade": 2.0
  }
  ```
- **Response Schema**:
  ```json
  {
    "reportId": "bt_1720000000",
    "symbol": "BTCUSDT",
    "timeframe": "15m",
    "strategy": "SMC Confluence",
    "totalTrades": 48,
    "winRate": 72.9,
    "profitFactor": 2.14,
    "maxDrawdown": 4.8,
    "sharpeRatio": 1.85,
    "equityCurve": [10000, 10150, 10100, 10320]
  }
  ```
- **Error Schema**:
  ```json
  { "error": "Insufficient candle history for backtest" }
  ```
- **External Dependencies**: Binance API, Yahoo Finance API
- **Database Dependencies**: None
- **Frontend Consumers**: `BacktestWorkspace.tsx`

---

### 6.2 POST `/api/agent/strategy-sweep`
- **HTTP Method**: `POST`
- **URL**: `/api/agent/strategy-sweep`
- **Authentication**: None
- **Request Parameters**: None
- **Request Body**:
  ```json
  {
    "symbol": "EURUSD",
    "timeframe": "15m"
  }
  ```
- **Response Schema**:
  ```json
  {
    "sweepId": "sweep_1720000000",
    "symbol": "EURUSD",
    "timeframe": "15m",
    "winningStrategy": "SMC Confluence",
    "winRate": 78.4,
    "allStrategyMetrics": [
      { "name": "SMC Confluence", "winRate": 78.4, "profitFactor": 2.2 },
      { "name": "Trend Breakout", "winRate": 68.1, "profitFactor": 1.6 }
    ]
  }
  ```
- **Error Schema**:
  ```json
  { "error": "Strategy sweep execution failed" }
  ```
- **External Dependencies**: Binance API, Finnhub API
- **Database Dependencies**: Firestore (`strategy_sweeps` collection)
- **Frontend Consumers**: `StrategyStudioWorkspace.tsx`, `StrategySweepDashboard.tsx`

---

## 7. AI & Sentiment Endpoints

### 7.1 GET `/api/ai/finnhub-news`
- **HTTP Method**: `GET`
- **URL**: `/api/ai/finnhub-news`
- **Authentication**: None
- **Request Parameters**:
  - `category` (query, string, optional, default: `general`)
- **Request Body**: None
- **Response Schema**:
  ```json
  [
    {
      "id": 10293,
      "headline": "Fed Signals Rate Stance",
      "source": "Reuters",
      "url": "https://...",
      "summary": "...",
      "datetime": 1720000000
    }
  ]
  ```
- **Error Schema**:
  ```json
  { "error": "Failed to fetch market news" }
  ```
- **External Dependencies**: Finnhub API
- **Database Dependencies**: None
- **Frontend Consumers**: `NewsSentimentTerminal.tsx`

---

### 7.2 POST `/api/ai/evaluate-pair`
- **HTTP Method**: `POST`
- **URL**: `/api/ai/evaluate-pair`
- **Authentication**: None
- **Request Parameters**: None
- **Request Body**:
  ```json
  {
    "symbol": "EUR/USD",
    "timeframe": "15m",
    "strategies": ["SMC Confluence", "Trend Breakout"]
  }
  ```
- **Response Schema**:
  ```json
  {
    "symbol": "EUR/USD",
    "directional_bias": "BUY",
    "win_rate_probability": 91,
    "suggested_entry": 1.1548,
    "reasoning": "Confluence Analysis confirmed for EUR/USD using SMC Confluence + Trend Breakout (15m expiry)."
  }
  ```
- **Error Schema**:
  ```json
  { "error": "Failed to evaluate pair" }
  ```
- **External Dependencies**: Binance API, Finnhub API, Google GenAI (Gemini)
- **Database Dependencies**: None
- **Frontend Consumers**: `QuickOrderPanel.tsx`

---

## 8. System Diagnostics & Health Endpoints

### 8.1 GET `/api/system/health`
- **HTTP Method**: `GET`
- **URL**: `/api/system/health`
- **Authentication**: None
- **Request Parameters**: None
- **Request Body**: None
- **Response Schema**:
  ```json
  {
    "status": "HEALTHY",
    "services": {
      "database": { "status": "ONLINE", "latency": 6 },
      "cache": { "status": "ONLINE", "latency": 5 },
      "exchange_ws": { "status": "ONLINE", "latency": 42 },
      "agent_worker": { "status": "IDLE", "latency": 0 }
    },
    "system_metrics": {
      "cpu_usage_pct": 32,
      "ram_usage_mb": 327,
      "uptime_seconds": 2438
    }
  }
  ```
- **Error Schema**:
  ```json
  { "status": "UNHEALTHY", "error": "string" }
  ```
- **External Dependencies**: None
- **Database Dependencies**: Firestore ping check
- **Frontend Consumers**: `SystemHealthDashboard.tsx`
