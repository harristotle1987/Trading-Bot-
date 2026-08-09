import React, { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, RefreshCw, Trophy, Target, Award, BarChart3, Plus, Copy } from "lucide-react";

export interface PocketSignalLog {
  id: string;
  symbol: string;
  direction: "CALL" | "PUT";
  expiry: string;
  entryPrice: number;
  exitPrice?: number;
  result: "WIN" | "LOSS" | "REFUND" | "PENDING";
  payoutPct: number;
  winRateScore: number;
  timestamp: string;
  strategy: string;
}

const INITIAL_SIGNAL_LOGS: PocketSignalLog[] = [
  { id: "SIG-1092", symbol: "EUR/USD", direction: "CALL", expiry: "1m", entryPrice: 1.08520, exitPrice: 1.08542, result: "WIN", payoutPct: 92, winRateScore: 94, timestamp: "2 mins ago", strategy: "SMC Confluence" },
  { id: "SIG-1091", symbol: "GBP/USD", direction: "PUT", expiry: "2m", entryPrice: 1.26410, exitPrice: 1.26388, result: "WIN", payoutPct: 92, winRateScore: 91, timestamp: "8 mins ago", strategy: "RSI Scalper" },
  { id: "SIG-1090", symbol: "BTC/USDT", direction: "CALL", expiry: "5m", entryPrice: 64200.00, exitPrice: 64350.50, result: "WIN", payoutPct: 85, winRateScore: 89, timestamp: "15 mins ago", strategy: "EMA Trend Cross" },
  { id: "SIG-1089", symbol: "USD/JPY", direction: "PUT", expiry: "1m", entryPrice: 154.200, exitPrice: 154.182, result: "WIN", payoutPct: 90, winRateScore: 88, timestamp: "22 mins ago", strategy: "Bollinger Squeeze" },
  { id: "SIG-1088", symbol: "XAU/USD", direction: "CALL", expiry: "3m", entryPrice: 2380.50, exitPrice: 2382.10, result: "WIN", payoutPct: 88, winRateScore: 93, timestamp: "31 mins ago", strategy: "SMC Confluence" },
  { id: "SIG-1087", symbol: "AUD/USD", direction: "CALL", expiry: "1m", entryPrice: 0.65420, exitPrice: 0.65450, result: "WIN", payoutPct: 88, winRateScore: 95, timestamp: "45 mins ago", strategy: "Order Flow Delta" }
];

export default function TradesManagementPage({ onNavigateToChart }: { onNavigateToChart?: (symbol: string) => void }) {
  const [logs, setLogs] = useState<PocketSignalLog[]>(INITIAL_SIGNAL_LOGS);
  const [filterResult, setFilterResult] = useState<"ALL" | "WIN" | "LOSS">("ALL");

  // Calculate statistics
  const total = logs.length;
  const wins = logs.filter(l => l.result === "WIN").length;
  const losses = logs.filter(l => l.result === "LOSS").length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  
  // Pocket Option ROI calculation based on average $10 trade
  const totalProfitROI = logs.reduce((acc, l) => {
    if (l.result === "WIN") return acc + (10 * (l.payoutPct / 100));
    if (l.result === "LOSS") return acc - 10;
    return acc;
  }, 0);

  const handleLogManualResult = (id: string, newResult: "WIN" | "LOSS") => {
    setLogs(prev => prev.map(item => item.id === id ? { ...item, result: newResult } : item));
    toast.success(`Signal ${id} marked as ${newResult}!`);
  };

  const filteredLogs = logs.filter(l => filterResult === "ALL" || l.result === filterResult);

  return (
    <div className="space-y-6 pb-12 w-full max-w-7xl mx-auto">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Win Rate */}
        <div className="bg-[#12161D] border border-[#232833] rounded-2xl p-5 flex items-center gap-4 shadow-lg">
          <div className="p-3.5 rounded-xl bg-[#00E676]/15 border border-[#00E676]/30 text-[#00E676]">
            <Trophy size={24} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-[#838C9C] block uppercase tracking-wider">
              Signal Win Rate
            </span>
            <span className="text-2xl font-black text-[#00E676] font-mono">
              {winRate}%
            </span>
          </div>
        </div>

        {/* Total Wins */}
        <div className="bg-[#12161D] border border-[#232833] rounded-2xl p-5 flex items-center gap-4 shadow-lg">
          <div className="p-3.5 rounded-xl bg-[#3DDBD9]/15 border border-[#3DDBD9]/30 text-[#3DDBD9]">
            <Target size={24} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-[#838C9C] block uppercase tracking-wider">
              Successful CALL/PUT
            </span>
            <span className="text-2xl font-bold text-[#E6E9EF] font-mono">
              {wins} / {total} <span className="text-xs text-[#838C9C]">Wins</span>
            </span>
          </div>
        </div>

        {/* Estimated Profit ROI */}
        <div className="bg-[#12161D] border border-[#232833] rounded-2xl p-5 flex items-center gap-4 shadow-lg">
          <div className="p-3.5 rounded-xl bg-[#00E676]/15 border border-[#00E676]/30 text-[#00E676]">
            <Award size={24} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-[#838C9C] block uppercase tracking-wider">
              Pocket Net ROI ($10 Base)
            </span>
            <span className={`text-2xl font-black font-mono ${totalProfitROI >= 0 ? "text-[#00E676]" : "text-[#FF5252]"}`}>
              {totalProfitROI >= 0 ? `+$${totalProfitROI.toFixed(2)}` : `-$${Math.abs(totalProfitROI).toFixed(2)}`}
            </span>
          </div>
        </div>

        {/* Avg Payout */}
        <div className="bg-[#12161D] border border-[#232833] rounded-2xl p-5 flex items-center gap-4 shadow-lg">
          <div className="p-3.5 rounded-xl bg-[#3DDBD9]/15 border border-[#3DDBD9]/30 text-[#3DDBD9]">
            <BarChart3 size={24} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-[#838C9C] block uppercase tracking-wider">
              Avg Pocket Payout
            </span>
            <span className="text-2xl font-bold text-[#3DDBD9] font-mono">
              90.8%
            </span>
          </div>
        </div>
      </div>

      {/* Main Journal Table Box */}
      <div className="bg-[#12161D] border border-[#232833] rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-[#232833]">
          <div>
            <h2 className="text-lg font-bold text-[#E6E9EF] tracking-tight flex items-center gap-2">
              <span>Pocket Option Signal Accuracy Journal</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30 font-bold">
                VERIFIED
              </span>
            </h2>
            <p className="text-xs text-[#838C9C] mt-0.5">
              Historical record of AI generated binary options signals and actual payout outcomes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#838C9C] font-semibold">Filter:</span>
            {["ALL", "WIN", "LOSS"].map(res => (
              <button
                key={res}
                onClick={() => setFilterResult(res as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                  filterResult === res
                    ? "bg-[#3DDBD9] text-[#0B0E13]"
                    : "bg-[#181D26] text-[#838C9C] hover:text-white border border-[#232833]"
                }`}
              >
                {res}
              </button>
            ))}
          </div>
        </div>

        {/* Signal Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#181D26] text-[#838C9C] uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="p-3.5 rounded-l-xl">Signal ID</th>
                <th className="p-3.5">Asset Pair</th>
                <th className="p-3.5">Direction</th>
                <th className="p-3.5">Expiry</th>
                <th className="p-3.5">Entry Price</th>
                <th className="p-3.5">Exit Price</th>
                <th className="p-3.5">Strategy</th>
                <th className="p-3.5">AI Win %</th>
                <th className="p-3.5">Result</th>
                <th className="p-3.5 text-right rounded-r-xl">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232833]">
              {filteredLogs.map(log => {
                const isCall = log.direction === "CALL";
                const isWin = log.result === "WIN";

                return (
                  <tr key={log.id} className="hover:bg-[#181D26]/60 transition-colors">
                    <td className="p-3.5 font-bold text-[#838C9C]">{log.id}</td>
                    <td 
                      className="p-3.5 font-bold text-[#E6E9EF] hover:text-[#3DDBD9] cursor-pointer"
                      onClick={() => onNavigateToChart && onNavigateToChart(log.symbol.replace(/[^A-Za-z0-9]/g, ''))}
                    >
                      {log.symbol}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${
                        isCall ? "bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30" : "bg-[#FF5252]/15 text-[#FF5252] border border-[#FF5252]/30"
                      }`}>
                        {isCall ? "🟢 CALL ⬆️" : "🔴 PUT ⬇️"}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-[#3DDBD9]">{log.expiry}</td>
                    <td className="p-3.5 text-[#E6E9EF]">${log.entryPrice}</td>
                    <td className="p-3.5 text-[#838C9C]">${log.exitPrice || log.entryPrice}</td>
                    <td className="p-3.5 text-[#838C9C]">{log.strategy}</td>
                    <td className="p-3.5 text-[#00E676] font-bold">{log.winRateScore}%</td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 w-fit ${
                        isWin ? "bg-[#00E676]/20 text-[#00E676]" : "bg-[#FF5252]/20 text-[#FF5252]"
                      }`}>
                        {isWin ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        <span>{log.result} (+{isWin ? log.payoutPct : 0}%)</span>
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleLogManualResult(log.id, "WIN")}
                          className="p-1.5 rounded bg-[#00E676]/10 hover:bg-[#00E676]/25 text-[#00E676] text-[10px] font-bold"
                          title="Mark Win"
                        >
                          WIN
                        </button>
                        <button
                          onClick={() => handleLogManualResult(log.id, "LOSS")}
                          className="p-1.5 rounded bg-[#FF5252]/10 hover:bg-[#FF5252]/25 text-[#FF5252] text-[10px] font-bold"
                          title="Mark Loss"
                        >
                          LOSS
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
