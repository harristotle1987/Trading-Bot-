import React, { useState, useEffect } from "react";

interface WalletMetrics {
  total_equity: number;
  available_balance: number;
  currency: string;
  status: string;
}

export default function TopNavbar() {
  const [activeMode, setActiveMode] = useState<"DEMO" | "LIVE">("DEMO");
  const [needsAuth, setNeedsAuth] = useState(false);
  const [balances, setBalances] = useState<{
    demo: WalletMetrics;
    live: WalletMetrics;
  }>({
    demo: { total_equity: 10000.0, available_balance: 10000.0, currency: "USDT", status: "ONLINE" },
    live: { total_equity: 0.0, available_balance: 0.0, currency: "USDT", status: "OFFLINE" },
  });

  const checkAuthStatus = async () => {
    try {
      const res = await fetch("/api/config/keys");
      if (res.ok) {
        const data = await res.json();
        setNeedsAuth(data.ctrader_needs_auth);
      }
    } catch (err) {
      console.warn("Failed to fetch auth status:", err);
    }
  };

  const fetchBalances = async () => {
    try {
      const res = await fetch("/api/account/balances");
      if (res.ok) {
        const data = await res.json();
        setBalances(data);
      }
    } catch (err) {
      console.warn("Failed to fetch wallet balances:", err);
    }
  };

  useEffect(() => {
    fetchBalances();
    checkAuthStatus();
    const interval = setInterval(() => {
        fetchBalances();
        checkAuthStatus();
    }, 5000); // Auto refresh cash balances every 5s
    
    const handleBalanceUpdated = () => fetchBalances();
    window.addEventListener("balance_updated", handleBalanceUpdated);

    // Listen for OAuth success message from popup
    const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'CTRADER_OAUTH_SUCCESS') {
            setNeedsAuth(false);
            // Give server a moment to reconnect, then fetch balances
            setTimeout(fetchBalances, 2000);
        }
    };
    window.addEventListener('message', handleMessage);

    return () => {
        clearInterval(interval);
        window.removeEventListener("balance_updated", handleBalanceUpdated);
        window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleCTraderAuth = () => {
      window.open("/api/ctrader/auth", "_blank", "width=600,height=800");
  };

  return (
    <header className="h-[60px] border-b border-[#232833] bg-[#0B0E13] flex items-center justify-between px-8 z-30 font-sans">
      <div className="flex items-center gap-6">
          <div className="font-mono font-bold text-white text-base tracking-wider flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="w-8 h-8" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#00E676] inline-block animate-pulse"></span>
            <span>OBSIDIAN<span className="text-[#FFD600]">.AI</span></span>
          </div>
      </div>
      {/* Capital & Mode Display Badges */}
      <div className="flex items-center gap-3">
        {needsAuth && (
          <button
            onClick={handleCTraderAuth}
            className="animate-pulse mr-2 cursor-pointer px-4 py-1.5 rounded border border-[#FF1744] bg-[#FF1744]/10 hover:bg-[#FF1744]/20 text-white transition-all flex items-center gap-2 font-mono text-xs"
          >
            <span className="w-2 h-2 rounded-full bg-[#FF1744]"></span>
            <span className="font-bold text-[#FF1744]">cTrader Auth Required - Click Here</span>
          </button>
        )}
        {/* DEMO CASH BADGE */}
        <div
          onClick={() => setActiveMode("DEMO")}
          className={`cursor-pointer px-3 py-1.5 rounded border transition-all flex items-center gap-2 font-mono text-xs ${
            activeMode === "DEMO"
              ? "bg-[#00E676]/10 border-[#00E676] text-white"
              : "bg-[#121216] border-[#1E1E24] text-[#838C9C] opacity-70 hover:opacity-100"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#00E676]"></span>
          <div>
            <span className="text-[10px] uppercase text-[#838C9C] block leading-tight">DEMO CAPITAL</span>
            <span className="font-bold text-[#00E676]">
              ${balances.demo.total_equity.toLocaleString()} {balances.demo.currency}
            </span>
          </div>
        </div>

        {/* BYBIT LIVE CASH BADGE */}
        <div
          onClick={() => setActiveMode("LIVE")}
          className={`cursor-pointer px-3 py-1.5 rounded border transition-all flex items-center gap-2 font-mono text-xs ${
            activeMode === "LIVE"
              ? "bg-[#FFD600]/10 border-[#FFD600] text-white"
              : "bg-[#121216] border-[#1E1E24] text-[#838C9C] opacity-70 hover:opacity-100"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              balances.live.status === "ONLINE" ? "bg-[#FFD600] animate-ping" : "bg-gray-600"
            }`}
          ></span>
          <div>
            <span className="text-[10px] uppercase text-[#838C9C] block leading-tight flex items-center gap-1">
              LIVE
              <span className="text-[9px] text-[#FFD600]">
                ({balances.live.status})
              </span>
            </span>
            <span className="font-bold text-[#FFD600]">
              ${balances.live.total_equity.toLocaleString()} {balances.live.currency}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
