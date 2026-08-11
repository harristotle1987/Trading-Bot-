# OBSIDIAN TRADING SYSTEM V2 — ARCHITECTURE SPECIFICATION

## System Overview

The Obsidian Trading System V2 is a quantitative trading signal platform designed for manual trade execution across third-party platforms (Pocket Option, IQ Option, MetaTrader 4/5, cTrader).

---

## 1. High-Level Architecture Diagram

```
+----------------------------------------------------------------------------------------------------+
|                                      FRONTEND (React 19 + Vite)                                    |
|                                                                                                    |
|  [ TopNavbar ] [ OverviewDashboard ] [ PocketSignalsWorkspace ] [ TradesManagementPage ]           |
|  [ QuickOrderPanel ] [ BacktestWorkspace ] [ StrategyStudioWorkspace ] [ RiskDashboard ]           |
|  [ InteractiveChartsWorkspace ] [ AgentInsightPanel ] [ NewsSentimentTerminal ]                    |
|  [ SystemHealthDashboard ] [ ExecutionPanel ] [ APIKeysModal ] [ RiskSettings ]                    |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                          HTTP / REST & Pusher
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                                        BACKEND (Express.ts)                                        |
|                                                                                                    |
|  Primary Entry Point: /server.ts (Bundled via esbuild to dist/server.cjs)                         |
|  Serverless Handler: /api/index.js (Vercel Serverless Function wrapper)                            |
|                                                                                                    |
|  Modular Subservices:                                                                              |
|  • /services/nvidia_trader.ts (Forensics & NVDA signals)                                           |
|  • /api/bybit/v5/market/kline.ts (Bybit kline endpoint stub)                                        |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                                    INTERNAL CORE ENGINES                                           |
|                                                                                                    |
|  • Market Data Service (/src/lib/marketData.ts & /src/lib/providers/dataProvider.ts)              |
|  • Strategy & Sweep Engine (/src/lib/strategySweepEngine.ts)                                       |
|  • Realtime Sync (/src/hooks/useRealtimeData.ts & /src/lib/pusher.ts)                              |
|  • Trade State Engine (/src/hooks/useTradeState.ts)                                                |
|  • Math & Pricing Utilities (/src/utils/priceUtils.ts & /src/utils/tradeMath.ts)                   |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                                   EXTERNAL DATA PROVIDERS                                          |
|                                                                                                    |
|  • Binance REST / WS (Crypto candles & orderbook quotes)                                           |
|  • Finnhub REST (Forex quotes, market status & macro news)                                         |
|  • Yahoo Finance REST (Stocks, ETFs & indices candles)                                             |
|  • Open Exchange Rates / ExchangeRate API (Forex exchange rate trends)                              |
|  • cTrader Layer (@reiryoku/ctrader-layer Open API Protobuf client)                                 |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                               STORAGE & PERSISTENCE LAYER                                         |
|                                                                                                    |
|  • Primary DB: Firebase Firestore Admin SDK (/src/lib/firebase.ts)                                 |
|  • Local Config Sidecar: /pocket_settings.json (Pocket Option conservative settings)              |
|  • Server Memory Store: In-memory fallback objects for active trades, risk settings & signals      |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Component Boundaries & Responsibilities

### Frontend Layer (`/src`)
- Built with React 18/19, Vite, Tailwind CSS, and Lucide icons.
- Provides specialized dashboards for signal scanning, strategy backtesting, risk management, trade tracking, and chart visuals.
- Communicates with backend via standard HTTP REST API endpoints (`/api/*`) and real-time Pusher websocket events.

### Backend Layer (`/server.ts`)
- Express Node.js application compiled with `esbuild` into CommonJS (`dist/server.cjs`).
- Listens on `0.0.0.0:3000` locally/in containers and is wrapped by `/api/index.js` for Vercel serverless deployment.
- Hosts API routes for market data, trading signals, trade execution tracking, risk parameter updates, strategy sweeps, backtesting, and diagnostic checks.

### Market Data Layer (`/src/lib/providers/dataProvider.ts` & `/src/lib/marketData.ts`)
- Standardized `DataProvider` interface with adapters for Binance (Crypto), Finnhub (Forex/News), and Yahoo Finance (Stocks/Indices).
- Resolves normalized quote snapshots and OHLCV kline candles from real market APIs.

### Strategy Engine (`/src/lib/strategySweepEngine.ts`)
- Evaluates technical setups over historical and live candles (EMA trends, RSI, Bollinger Bands, Donchian Channels, SMC/FVG).
- Runs strategy sweeps across multiple symbols and timeframes.

### Persistence Layer (`/src/lib/firebase.ts`)
- Utilizes Firebase Firestore Admin SDK for server-side persistence of active/closed trades, strategy sweep outputs, system settings, and state snapshots.

---

## 3. Data Flow Architecture

1. **Market Data Retrieval**: Live quotes and candles fetched from Binance, Finnhub, or Yahoo Finance via `DataProvider` adapters.
2. **Signal Scanning / Confluence**: The server evaluates live candle series against strategy rules (SMC, Trend, Mean Reversion) and outputs setup metrics.
3. **User Execution**: The user reviews signals on the frontend dashboard and manually executes trades on external brokers (Pocket Option, MT4/5, etc.).
4. **Trade Lifecycle Tracking**: Executed trades are registered via `/api/trades/execute`, stored in Firestore, monitored for win/loss resolution, and logged in `/api/trades/closed`.
