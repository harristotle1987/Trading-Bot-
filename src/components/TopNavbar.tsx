import React, { useState, useEffect } from "react";

interface WalletMetrics {
  total_equity: number;
  available_balance: number;
  currency: string;
  status: string;
}

export default function TopNavbar() {
  const [activeMode, setActiveMode] = useState<"DEMO" | "LIVE">("DEMO");
  const [balances, setBalances] = useState<{
    demo: WalletMetrics;
    bybit_live: WalletMetrics;
  }>({
    demo: { total_equity: 10000.0, available_balance: 10000.0, currency: "USDT", status: "ONLINE" },
    bybit_live: { total_equity: 0.0, available_balance: 0.0, currency: "USDT", status: "OFFLINE" },
  });

  const fetchBalances = async () => {
    try {
      const res = await fetch("/api/account/balances");
      if (res.ok) {
        const data = await res.json();
        setBalances(data);
      }
    } catch (err) {
      console.error("Failed to fetch wallet balances:", err);
    }
  };

  useEffect(() => {
    fetchBalances();
    const interval = setInterval(fetchBalances, 5000); // Auto refresh cash balances every 5s
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-[60px] border-b border-[#232833] bg-[#0B0E13] flex items-center justify-between px-8 z-30 font-sans">
      <div className="flex items-center gap-6">
          <div className="font-mono font-bold text-white text-base tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00E676] inline-block animate-pulse"></span>
            <span>OBSIDIAN<span className="text-[#FFD600]">.AI</span></span>
          </div>
      </div>
      {/* Capital & Mode Display Badges */}
      <div className="flex items-center gap-3">
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
              balances.bybit_live.status === "ONLINE" ? "bg-[#FFD600] animate-ping" : "bg-gray-600"
            }`}
          ></span>
          <div>
            <span className="text-[10px] uppercase text-[#838C9C] block leading-tight flex items-center gap-1">
              BYBIT LIVE
              <span className="text-[9px] text-[#FFD600]">
                ({balances.bybit_live.status})
              </span>
            </span>
            <span className="font-bold text-[#FFD600]">
              ${balances.bybit_live.total_equity.toLocaleString()} {balances.bybit_live.currency}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
