/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Toaster, toast } from "sonner";
import { 
  LineChart, Briefcase, Bot, Settings, PieChart
} from "lucide-react";
import RiskDashboard from "./components/RiskDashboard";
import RiskSettings from "./components/RiskSettings";
import AgentControlPanel from "./components/AgentControlPanel";
import AgentInsightPanel from "./components/AgentInsightPanel";
import TradesManagementPage from "./components/TradesManagementPage";
import InteractiveChartsWorkspace from "./components/InteractiveChartsWorkspace";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import TopNavbar from "./components/TopNavbar";
import HistoricalTradesModal from "./components/HistoricalTradesModal";
import MarketTicker from "./components/MarketTicker";

export const TRADABLE_PAIRS = [
    // Crypto
    { symbol: "BTCUSDT", category: "crypto", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "ETHUSDT", category: "crypto", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "SOLUSDT", category: "crypto", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "XRPUSDT", category: "crypto", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "BNBUSDT", category: "crypto", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "ADAUSDT", category: "crypto", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "DOGEUSDT", category: "crypto", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "AVAXUSDT", category: "crypto", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "LINKUSDT", category: "crypto", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "DOTUSDT", category: "crypto", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "NEARUSDT", category: "crypto", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "SUIUSDT", category: "crypto", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "APTUSDT", category: "crypto", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "MATICUSDT", category: "crypto", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "LTCUSDT", category: "crypto", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "UNIUSDT", category: "crypto", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "ATOMUSDT", category: "crypto", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "ETCUSDT", category: "crypto", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "FILUSDT", category: "crypto", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "ARBUSDT", category: "crypto", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    // Forex
    { symbol: "EURUSD", category: "forex", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "GBPUSD", category: "forex", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "USDJPY", category: "forex", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "AUDUSD", category: "forex", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "USDCAD", category: "forex", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "USDCHF", category: "forex", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "NZDUSD", category: "forex", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "EURGBP", category: "forex", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "EURJPY", category: "forex", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "GBPJPY", category: "forex", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "AUDJPY", category: "forex", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "EURAUD", category: "forex", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "GBPCAD", category: "forex", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "CADJPY", category: "forex", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "CHFJPY", category: "forex", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    // Stocks
    { symbol: "AAPL", category: "stocks", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "MSFT", category: "stocks", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "TSLA", category: "stocks", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "AMZN", category: "stocks", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "GOOGL", category: "stocks", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "NVDA", category: "stocks", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "META", category: "stocks", timeframes: ["1m", "5m", "15m", "1h"] }
];

const NAV_ITEMS = [
  { id: "Charts", label: "Charts", icon: LineChart },
  { id: "Trades", label: "Trades", icon: Briefcase },
  { id: "Agent", label: "Agent", icon: Bot },
  { id: "Analytics", label: "Analytics", icon: PieChart },
  { id: "Settings", label: "Settings", icon: Settings }
];

interface NavItemProps {
  key?: string | number;
  label: string;
  icon: any;
  active?: boolean;
  onClick: () => void;
}

function DesktopNavItem({ label, icon: Icon, active = false, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 rounded-lg flex items-center gap-3 text-sm transition-all duration-200 text-left w-full ${
        active
          ? "bg-[#181D26] text-[#3DDBD9] font-medium shadow-[inset_2px_0_0_0_#3DDBD9]"
          : "text-[#838C9C] hover:text-[#E6E9EF] hover:bg-[#181D26]"
      }`}
    >
      <Icon size={18} className={active ? "text-[#3DDBD9]" : "text-[#838C9C]"} />
      {label}
    </button>
  );
}

function MobileNavItem({ label, icon: Icon, active = false, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors duration-200 ${
        active ? "text-[#3DDBD9]" : "text-[#838C9C]"
      }`}
    >
      <Icon size={20} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("Charts");
  const [chartFocusSymbol, setChartFocusSymbol] = useState<string | null>(null);

  const handleNavigateToChart = (symbol: string) => {
    setChartFocusSymbol(symbol);
    setActiveTab("Charts");
  };

  return (
    <div className="bg-[#0B0E13] text-[#E6E9EF] overflow-hidden flex flex-col md:flex-row h-[100dvh] relative font-sans">
      <Toaster position="bottom-right" theme="dark" />
      <HistoricalTradesModal />
      {/* Pulse Strip */}
      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-[#3DDBD9] to-transparent opacity-80 animate-pulse z-50"></div>

      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex w-[220px] bg-[#12161D] border-r border-[#232833] flex-col h-full z-40 relative">
        <div className="p-6 border-b border-[#232833] flex items-center h-[60px]">
          <span className="font-bold tracking-widest text-[#E6E9EF] text-sm uppercase">Nexus</span>
        </div>
        <nav className="flex-1 py-6 px-4 flex flex-col gap-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <DesktopNavItem 
              key={item.id} 
              label={item.label} 
              icon={item.icon} 
              active={activeTab === item.id} 
              onClick={() => setActiveTab(item.id)} 
            />
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden pb-[60px] md:pb-0">
        {/* Top Bar */}
        <TopNavbar />
        <MarketTicker />

        {/* Page Content */}
        <main className={`flex-1 overflow-auto relative w-full max-w-[100vw] ${activeTab === "Trades" ? "p-4 lg:p-0" : "p-4 md:p-6 lg:p-8"}`}>
          {activeTab === "Charts" ? (
            <InteractiveChartsWorkspace initialSymbol={chartFocusSymbol} />
          ) : activeTab === "Trades" ? (
            <div className="h-full flex flex-col space-y-6 pb-4 w-full">
              <TradesManagementPage onNavigateToChart={handleNavigateToChart} />
            </div>
          ) : activeTab === "Agent" ? (
            <div className="h-full space-y-8 pb-8 flex flex-col lg:flex-row gap-8">
              <AgentControlPanel />
              <AgentInsightPanel selectedSymbol={chartFocusSymbol || "BTCUSDT"} />
            </div>
          ) : activeTab === "Analytics" ? (
            <div className="h-full flex flex-col space-y-6 pb-4 w-full">
              <AnalyticsDashboard />
            </div>
          ) : activeTab === "Settings" ? (
            <div className="h-full flex flex-col space-y-6 pb-4 w-full">
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

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[60px] bg-[#12161D] border-t border-[#232833] flex items-center justify-around z-50 overflow-x-auto px-2">
         {NAV_ITEMS.map((item) => (
            <div key={item.id} className="min-w-[64px] h-full flex-shrink-0">
              <MobileNavItem 
                label={item.label} 
                icon={item.icon} 
                active={activeTab === item.id} 
                onClick={() => setActiveTab(item.id)} 
              />
            </div>
          ))}
      </nav>
    </div>
  );
}