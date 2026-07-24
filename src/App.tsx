/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Toaster, toast } from "sonner";
import RiskDashboard from "./components/RiskDashboard";
import RiskSettings from "./components/RiskSettings";
import ExecutionPanel from "./components/ExecutionPanel";
import BacktestWorkspace from "./components/BacktestWorkspace";
import AgentControlPanel from "./components/AgentControlPanel";
import AgentInsightPanel from "./components/AgentInsightPanel";
import NewsSentimentTerminal from "./components/NewsSentimentTerminal";
import SystemHealthDashboard from "./components/SystemHealthDashboard";
import ChartHistory from "./components/ChartHistory";
import TradesManagementPage from "./components/TradesManagementPage";
import InteractiveChartsWorkspace from "./components/InteractiveChartsWorkspace";
import LogsTerminal from "./components/LogsTerminal";
import TopNavbar from "./components/TopNavbar";

export const TRADABLE_PAIRS = [
    // Crypto
    { symbol: "BTCUSDT", category: "crypto", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "ETHUSDT", category: "crypto", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "SOLUSDT", category: "crypto", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "XRPUSDT", category: "crypto", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "BNBUSDT", category: "crypto", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "ADAUSDT", category: "crypto", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "DOGEUSDT", category: "crypto", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "AVAXUSDT", category: "crypto", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "LINKUSDT", category: "crypto", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "DOTUSDT", category: "crypto", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "NEARUSDT", category: "crypto", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "SUIUSDT", category: "crypto", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "APTUSDT", category: "crypto", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "MATICUSDT", category: "crypto", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "LTCUSDT", category: "crypto", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "UNIUSDT", category: "crypto", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "ATOMUSDT", category: "crypto", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "ETCUSDT", category: "crypto", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "FILUSDT", category: "crypto", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "ARBUSDT", category: "crypto", timeframes: ["1m", "5m", "15m", "1h"] },
    // Forex
    { symbol: "EURUSD", category: "forex", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "GBPUSD", category: "forex", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "USDJPY", category: "forex", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "AUDUSD", category: "forex", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "USDCAD", category: "forex", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "USDCHF", category: "forex", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "NZDUSD", category: "forex", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "EURGBP", category: "forex", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "EURJPY", category: "forex", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "GBPJPY", category: "forex", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "AUDJPY", category: "forex", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "EURAUD", category: "forex", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "GBPCAD", category: "forex", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "CADJPY", category: "forex", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "CHFJPY", category: "forex", timeframes: ["1m", "5m", "15m", "1h"] }
];



function NavItem({ label, active = false, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  const handleClick = () => {
    toast(`Navigating to ${label}`);
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={`px-4 py-2.5 rounded text-sm transition-colors duration-200 text-left w-full ${
        active
          ? "bg-[#181D26] text-[#E6E9EF] border-l-2 border-[#3DDBD9] font-medium"
          : "text-[#838C9C] hover:text-[#E6E9EF] hover:bg-[#181D26]"
      }`}
    >
      {label}
    </button>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("Charts");

  return (
    <div className="bg-[#0B0E13] text-[#E6E9EF] overflow-hidden flex h-screen relative font-sans">
      <Toaster position="bottom-right" theme="dark" />
      {/* Pulse Strip */}
      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-[#3DDBD9] to-transparent opacity-80 animate-pulse z-50"></div>

      {/* Left Sidebar */}
      <aside className="w-[220px] bg-[#12161D] border-r border-[#232833] flex flex-col h-full z-40 relative">
        <div className="p-6 border-b border-[#232833] flex items-center h-[60px]">
          <span className="font-bold tracking-widest text-[#E6E9EF] text-sm uppercase">Nexus</span>
        </div>
        <nav className="flex-1 py-6 px-4 flex flex-col gap-2">
          <NavItem label="Charts" active={activeTab === "Charts"} onClick={() => setActiveTab("Charts")} />
          <NavItem label="Trades" active={activeTab === "Trades"} onClick={() => setActiveTab("Trades")} />
          <NavItem label="Backtest" active={activeTab === "Backtest"} onClick={() => setActiveTab("Backtest")} />
          <NavItem label="Agent" active={activeTab === "Agent"} onClick={() => setActiveTab("Agent")} />
          <NavItem label="Sentiment" active={activeTab === "Sentiment"} onClick={() => setActiveTab("Sentiment")} />
          <NavItem label="System" active={activeTab === "System"} onClick={() => setActiveTab("System")} />
          <NavItem label="Snapshots" active={activeTab === "Snapshots"} onClick={() => setActiveTab("Snapshots")} />
          <NavItem label="Logs" active={activeTab === "Logs"} onClick={() => setActiveTab("Logs")} />
          <NavItem label="Settings" active={activeTab === "Settings"} onClick={() => setActiveTab("Settings")} />
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Top Bar */}
        <TopNavbar />

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-8 relative">
          {activeTab === "Charts" ? (
            <InteractiveChartsWorkspace />
          ) : activeTab === "Trades" ? (
            <div className="h-full space-y-8 pb-8">
              <TradesManagementPage />
            </div>
          ) : activeTab === "Backtest" ? (
            <div className="h-full space-y-8 pb-8">
              <BacktestWorkspace />
            </div>
          ) : activeTab === "Agent" ? (
            <div className="h-full space-y-8 pb-8 flex flex-col lg:flex-row gap-8">
              <AgentControlPanel />
              <AgentInsightPanel />
            </div>
          ) : activeTab === "Sentiment" ? (
            <div className="h-full space-y-8 pb-8">
              <NewsSentimentTerminal />
            </div>
          ) : activeTab === "System" ? (
            <div className="h-full space-y-8 pb-8">
              <SystemHealthDashboard />
            </div>
          ) : activeTab === "Snapshots" ? (
            <div className="h-full space-y-8 pb-8">
              <ChartHistory />
            </div>
          ) : activeTab === "Logs" ? (
            <div className="h-full space-y-8 pb-8">
              <LogsTerminal />
            </div>
          ) : activeTab === "Settings" ? (
            <div className="h-full space-y-8 pb-8">
              <RiskDashboard />
              <RiskSettings />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="font-mono text-[#838C9C] text-sm" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                [ NEXUS TRADING TERMINAL WAITING FOR DATA: {activeTab.toUpperCase()} ]
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}