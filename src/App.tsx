/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Toaster } from "sonner";
import { LineChart, Briefcase, Zap, Cpu, Loader2 } from "lucide-react";
import TradesManagementPage from "./components/TradesManagementPage";
import InteractiveChartsWorkspace from "./components/InteractiveChartsWorkspace";
import TopNavbar from "./components/TopNavbar";
import HistoricalTradesModal from "./components/HistoricalTradesModal";
import QuickOrderPanel from "./components/QuickOrderPanel";
import PocketSignalsWorkspace from "./components/PocketSignalsWorkspace";
import StrategyStudioWorkspace from "./components/StrategyStudioWorkspace";
import { PWAInstallNotification } from "./components/PWAInstallNotification";

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

    // Forex (Non-OTC)
    { symbol: "EURUSD", category: "forex", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "GBPUSD", category: "forex", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "USDJPY", category: "forex", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "AUDUSD", category: "forex", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "USDCAD", category: "forex", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "USDCHF", category: "forex", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "EURGBP", category: "forex", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "GBPJPY", category: "forex", timeframes: ["1s", "1m", "5m", "15m", "1h"] },

    // Commodities & Metals
    { symbol: "XAUUSD", category: "forex", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    { symbol: "XAGUSD", category: "forex", timeframes: ["1s", "1m", "5m", "15m", "1h"] },

    // Stocks
    { symbol: "AAPL", category: "stocks", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "MSFT", category: "stocks", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "NVDA", category: "stocks", timeframes: ["1m", "5m", "15m", "1h"] }
];

const NAV_ITEMS = [
  { id: "Signals", label: "Signals", icon: Zap },
  { id: "Strategies", label: "Strategies", icon: Cpu },
  { id: "Charts", label: "Charts", icon: LineChart },
  { id: "Journal", label: "Journal", icon: Briefcase }
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
          ? "bg-[#181D26] text-[#3DDBD9] font-bold shadow-[inset_2px_0_0_0_#3DDBD9]"
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
        active ? "text-[#3DDBD9] font-bold" : "text-[#838C9C]"
      }`}
    >
      <Icon size={20} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("Signals");
  const [chartFocusSymbol, setChartFocusSymbol] = useState<string | null>(null);
  const [activeStrategyId, setActiveStrategyId] = useState<string>("day-trading");
  const [activeTimeframe, setActiveTimeframe] = useState<string>("15m");
  const [isBooting, setIsBooting] = useState(true);
  const [bootText, setBootText] = useState("Initializing System...");

  useEffect(() => {
    if (!isBooting) return;
    const steps = [
      "Connecting to Finnhub Live WebSocket...",
      "Establishing connection to ByBit & Bitget...",
      "Authenticating with NVIDIA AI Engine...",
      "Loading CTrader bridging protocols...",
      "Connecting to Polygon.io data feeds...",
      "Synchronizing Exchange Rate APIs...",
      "Aggregating real-time market data...",
      "Warming up machine learning models...",
      "System Ready."
    ];
    let stepIndex = 0;
    
    const interval = setInterval(() => {
      stepIndex++;
      if (stepIndex < steps.length) {
        setBootText(steps[stepIndex]);
      } else {
        clearInterval(interval);
        setTimeout(() => setIsBooting(false), 500);
      }
    }, 1200); // ~10 seconds total

    return () => clearInterval(interval);
  }, [isBooting]);

  const handleNavigateToChart = (symbol: string) => {
    setChartFocusSymbol(symbol);
    setActiveTab("Charts");
  };

  const handleActivateStrategy = (stratId: string, timeframe: string) => {
    setActiveStrategyId(stratId);
    setActiveTimeframe(timeframe);
    setActiveTab("Signals");
  };

  const triggerReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn("Storage reset warning:", e);
    }
    setActiveStrategyId('day-trading');
    setActiveTimeframe('30m');
    setChartFocusSymbol('EURUSD');
    setActiveTab('Signals');
    setIsBooting(true);
    setBootText("Resetting All Signals, Timers & Systems...");
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  if (isBooting) {
    return (
      <div className="bg-[#0B0E13] text-[#E6E9EF] h-[100dvh] flex flex-col items-center justify-center font-mono">
        <div className="p-4 rounded-full bg-gradient-to-tr from-[#3DDBD9]/20 to-[#00E676]/20 border border-[#3DDBD9]/40 mb-6">
          <Zap size={40} className="text-[#3DDBD9] animate-pulse" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2 tracking-widest uppercase">Pocket Bot Core</h1>
        <div className="flex items-center gap-3 text-[#00E676] mt-4">
          <Loader2 className="animate-spin" size={20} />
          <span className="text-sm">{bootText}</span>
        </div>
        <div className="w-[300px] h-1 bg-[#232833] rounded-full mt-8 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#3DDBD9] to-[#00E676] animate-pulse" style={{ width: '100%', animationDuration: '2s' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0B0E13] text-[#E6E9EF] overflow-hidden flex flex-col md:flex-row h-[100dvh] relative font-sans">
      <Toaster position="top-right" theme="dark" closeButton duration={5000} toastOptions={{ style: { background: '#12161D', color: '#E6E9EF', border: '1px solid #232833' }, duration: 5000 }} />
      <HistoricalTradesModal />
      {/* Pulse Strip */}
      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-[#3DDBD9] to-transparent opacity-80 animate-pulse z-50"></div>

      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex w-[220px] bg-[#12161D] border-r border-[#232833] flex-col h-full z-40 relative">
        <div className="p-6 border-b border-[#232833] flex items-center justify-between h-[60px]">
          <div className="flex items-center gap-2 font-black text-sm text-[#E6E9EF] tracking-wider uppercase">
            <Zap size={18} className="text-[#3DDBD9]" />
            <span>Pocket Bot</span>
          </div>
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
        <TopNavbar onReset={triggerReset} />

        {/* Page Content */}
        <main className={`flex-1 overflow-auto relative w-full max-w-[100vw] ${activeTab === "Journal" ? "p-4 lg:p-6" : "p-4 md:p-6 lg:p-8"}`}>
          {activeTab === "Signals" ? (
            <PocketSignalsWorkspace 
              onNavigateToChart={handleNavigateToChart} 
              initialStrategyId={activeStrategyId}
              initialTimeframe={activeTimeframe}
            />
          ) : activeTab === "Strategies" ? (
            <StrategyStudioWorkspace 
              onActivateStrategy={handleActivateStrategy}
              onNavigateToSignals={() => setActiveTab("Signals")}
            />
          ) : activeTab === "Charts" ? (
            <InteractiveChartsWorkspace initialSymbol={chartFocusSymbol} />
          ) : (
            <div className="h-full flex flex-col space-y-6 pb-4 w-full">
              <TradesManagementPage onNavigateToChart={handleNavigateToChart} />
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[60px] bg-[#12161D] border-t border-[#232833] flex items-center justify-around z-50 overflow-x-auto px-2">
         {NAV_ITEMS.map((item) => (
            <div key={item.id} className="min-w-[56px] h-full flex-shrink-0">
              <MobileNavItem 
                label={item.label} 
                icon={item.icon} 
                active={activeTab === item.id} 
                onClick={() => setActiveTab(item.id)} 
              />
            </div>
          ))}
      </nav>
      <QuickOrderPanel activeSymbol={chartFocusSymbol || "EURUSD"} accountMode="DEMO" />
      <PWAInstallNotification />
    </div>
  );
}
