import React, { useState, useEffect } from "react";
import { useRealtimeData } from "../hooks/useRealtimeData";
import { toast } from "sonner";

interface ClosedPosition {
  id: string;
  account_mode: "DEMO" | "LIVE";
  broker: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  entry_price: number;
  realized_pnl: number;
  pnl_pct?: number;
  pips?: number;
  status: string;
  opened_at: string;
  closed_at: string;
}

export default function ClosedTrades() {
  const { positions } = useRealtimeData();
  const trades = positions.filter(p => p.status === 'CLOSED') as ClosedPosition[];
  const [isOpen, setIsOpen] = useState(false);

  const calculateDuration = (openedAt: string, closedAt: string) => {
    const start = new Date(openedAt).getTime();
    const end = new Date(closedAt).getTime();
    const diffMs = end - start;
    const diffMins = Math.floor(diffMs / 60000);
    return `${diffMins}m`;
  };

  return (
    <div className="bg-[#0B0C10] border-2 border-[#1F2833] rounded-lg p-6 mt-8">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-xl font-bold font-mono tracking-widest uppercase text-white mb-6"
      >
        <span>Historical Closed Trades</span>
        <span>{isOpen ? '▲' : '▼'}</span>
      </button>
      
      {isOpen && (
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#12161D] text-[#838C9C] uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="p-4">Symbol</th>
                <th className="p-4">Side</th>
                <th className="p-4">Entry</th>
                <th className="p-4">Pips</th>
                <th className="p-4">Realized PnL</th>
                <th className="p-4">Duration</th>
                <th className="p-4">Closed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2833]">
              {trades.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-[#838C9C]">No closed trades yet.</td>
                </tr>
              ) : (
                trades.slice().reverse().map((t) => (
                  <tr key={t.id} className="hover:bg-[#1A1A22] transition-colors">
                    <td className="p-4 text-white font-bold">{t.symbol}</td>
                    <td className={`p-4 ${t.side === "BUY" ? "text-[#00E676]" : "text-[#FF1744]"}`}>{t.side}</td>
                    <td className="p-4 text-[#838C9C]">${t.entry_price}</td>
                    <td className="p-4 text-white font-bold">
                      {t.pips !== undefined ? (
                        <span className={t.pips >= 0 ? "text-[#00E676]" : "text-[#FF1744]"}>
                          {t.pips >= 0 ? `+${t.pips.toFixed(1)}` : t.pips.toFixed(1)} pips
                        </span>
                      ) : "-"}
                    </td>
                    <td className={`p-4 font-bold ${t.realized_pnl >= 0 ? "text-[#00E676]" : "text-[#FF1744]"}`}>
                      <div>{t.realized_pnl >= 0 ? `+$${t.realized_pnl.toFixed(2)}` : `-$${Math.abs(t.realized_pnl).toFixed(2)}`}</div>
                      {t.pnl_pct !== undefined && (
                        <div className="text-[10px] opacity-80">
                          {t.pnl_pct >= 0 ? `+${t.pnl_pct.toFixed(2)}%` : `${t.pnl_pct.toFixed(2)}%`}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-[#E6E9EF]">{calculateDuration(t.opened_at, t.closed_at)}</td>
                    <td className="p-4 text-[#838C9C]">{new Date(t.closed_at).toLocaleTimeString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
