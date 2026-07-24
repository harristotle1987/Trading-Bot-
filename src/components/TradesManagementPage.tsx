import React, { useState, useEffect } from "react";
import { toast } from "sonner";

interface Position {
  id: string;
  account_mode: "DEMO" | "LIVE";
  broker: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  entry_price: number;
  current_mark_price: number;
  stop_loss: number;
  take_profit: number;
  unrealized_pnl: number;
  ai_confidence_score: number;
  status: string;
  opened_at: string;
}

export default function TradesManagementPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [filterMode, setFilterMode] = useState<"ALL" | "DEMO" | "LIVE">("ALL");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchPositions = async () => {
    try {
      const res = await fetch("/api/trades/active");
      if (!res.ok) {
        console.error("API Error:", res.status, await res.text());
        return;
      }
      const data = await res.json();
      setPositions(data || []);
    } catch (err) {
      console.error("Error fetching trades:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClosePosition = async (id: string, mode: "DEMO" | "LIVE") => {
    console.log("Attempting to close position:", id, mode);
    if (!confirm(`Are you sure you want to close position ${id}?`)) return;
    try {
      const res = await fetch("/api/trades/close", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position_id: id, account_mode: mode }),
      });
      console.log("Close response status:", res.status);
      const data = await res.json();
      console.log("Close response data:", data);
      toast.success(`[${mode}] Trade Closed! Realized PnL: $${data.realized_pnl}`);
      fetchPositions(); // Refresh trades list instantly
    } catch (err: any) {
      toast.error(`Failed to close position: ${err.message}`);
      console.error("Failed to close position:", err);
    }
  };

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 3000); // Poll live mark prices every 3s
    return () => clearInterval(interval);
  }, []);

  const filteredPositions = positions.filter(
    (p) => filterMode === "ALL" || p.account_mode === filterMode
  );

  const totalPnL = filteredPositions.reduce((acc, p) => acc + p.unrealized_pnl, 0);

  return (
    <div className="bg-[#0B0C10] text-[#E0E0E0] p-3 md:p-8 font-sans rounded-lg border-2 border-[#1F2833] shadow-2xl h-full flex flex-col">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b-2 border-[#1F2833] pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold font-mono tracking-widest uppercase text-white flex items-center gap-3">
            <span>LIVE TRADES MANAGEMENT</span>
            <span className="text-xs px-2 py-0.5 rounded bg-[#1A1A22] border border-[#3DDBD9] font-mono text-[#3DDBD9] font-bold">
              SYNCHRONIZED
            </span>
          </h1>
          <p className="text-xs text-[#838C9C] mt-2 tracking-wide">
            Monitor open positions across Charts & AI Agent executions.
          </p>
        </div>

        {/* Filter Controls & Total PnL Badge */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
          <div className="flex bg-[#12161D] border-2 border-[#1F2833] rounded p-1">
            {["ALL", "DEMO", "LIVE"].map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setFilterMode(mode as any);
                  toast(`Filter set to ${mode}`);
                }}
                className={`px-4 py-1.5 text-xs font-bold font-mono rounded transition-colors ${
                  filterMode === mode ? "bg-[#3DDBD9] text-[#0B0C10] shadow-[0_0_10px_rgba(61,219,217,0.3)]" : "text-[#838C9C] hover:text-white hover:bg-[#1F2833]"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="bg-[#12161D] border-2 border-[#1F2833] px-4 py-2 rounded text-right shadow-inner min-w-[120px]">
            <div className="text-[10px] font-mono font-bold text-[#838C9C] uppercase tracking-wider">Total Open PnL</div>
            <div
              className={`font-mono text-lg font-bold ${
                totalPnL >= 0 ? "text-[#00E676]" : "text-[#FF1744]"
              }`}
            >
              {totalPnL >= 0 ? `+$${totalPnL.toFixed(2)}` : `-$${Math.abs(totalPnL).toFixed(2)}`}
            </div>
          </div>
        </div>
      </div>

      {/* Responsive Trades View: Desktop Table / Mobile Cards */}
      {isLoading ? (
        <div className="text-center font-mono font-bold text-[#838C9C] py-12 flex-1 flex items-center justify-center">Loading active trades...</div>
      ) : filteredPositions.length === 0 ? (
        <div className="text-center font-mono text-[#838C9C] py-12 bg-[#12161D] rounded border-2 border-[#1F2833] flex-1 flex flex-col items-center justify-center gap-4">
          <svg className="w-12 h-12 text-[#3DDBD9]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          <div>No active open trades found. Execute a trade from the <span className="text-[#3DDBD9] font-bold">Charts</span> section to monitor it here.</div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto min-h-0">
          {/* Desktop Table View (Hidden on mobile) */}
          <div className="hidden md:block overflow-x-auto bg-[#12161D] border-2 border-[#1F2833] rounded-lg">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-[#0B0C10] border-b-2 border-[#1F2833] text-[#838C9C] uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="p-4">Mode</th>
                  <th className="p-4">Symbol</th>
                  <th className="p-4">Side</th>
                  <th className="p-4">Qty</th>
                  <th className="p-4">Entry</th>
                  <th className="p-4">Mark Price</th>
                  <th className="p-4">SL / TP</th>
                  <th className="p-4">NVIDIA AI Score</th>
                  <th className="p-4">Unrealized PnL</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-[#1F2833]">
                {filteredPositions.map((p) => (
                  <tr key={p.id} className="hover:bg-[#1A1A22] transition-colors group">
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider ${
                          p.account_mode === "DEMO"
                            ? "bg-[#3DDBD9]/10 text-[#3DDBD9] border border-[#3DDBD9]/30"
                            : "bg-[#FF1744]/10 text-[#FF1744] border border-[#FF1744]/30"
                        }`}
                      >
                        {p.account_mode}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-white text-sm">{p.symbol}</td>
                    <td className="p-4">
                      <span className={p.side === "BUY" ? "text-[#00E676] font-bold" : "text-[#FF1744] font-bold"}>
                        {p.side}
                      </span>
                    </td>
                    <td className="p-4 text-[#E6E9EF] font-bold">{p.quantity}</td>
                    <td className="p-4 text-[#838C9C]">${p.entry_price}</td>
                    <td className="p-4 text-white font-bold bg-[#0B0C10]/50">${p.current_mark_price}</td>
                    <td className="p-4 text-[#838C9C]">
                      <span className="text-[#FF1744]/80 font-bold">${p.stop_loss || '0.00'}</span> / <span className="text-[#00E676]/80 font-bold">${p.take_profit || '0.00'}</span>
                    </td>
                    <td className="p-4 text-[#FFD600] font-bold">{p.ai_confidence_score || 'N/A'}%</td>
                    <td className={`p-4 font-bold text-sm bg-[#0B0C10]/50 ${p.unrealized_pnl >= 0 ? "text-[#00E676]" : "text-[#FF1744]"}`}>
                      {p.unrealized_pnl >= 0 ? `+$${p.unrealized_pnl.toFixed(2)}` : `-$${Math.abs(p.unrealized_pnl).toFixed(2)}`}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleClosePosition(p.id, p.account_mode)}
                        className="px-4 py-2 bg-[#1F2833] hover:bg-[#FF1744] text-white font-bold rounded text-[11px] transition-colors border border-[#1F2833] hover:border-[#FF1744] group-hover:shadow-[0_0_10px_rgba(255,23,68,0.2)] uppercase tracking-wider"
                      >
                        Close Market
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Stack View (Visible only on small screens) */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredPositions.map((p) => (
              <div key={p.id} className="bg-[#12161D] border-2 border-[#1F2833] rounded-lg p-4 space-y-3 font-mono shadow-lg">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-lg">{p.symbol}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                        p.side === "BUY" ? "bg-[#00E676]/20 text-[#00E676]" : "bg-[#FF1744]/20 text-[#FF1744]"
                      }`}
                    >
                      {p.side}
                    </span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold tracking-wider ${p.account_mode === "DEMO" ? "bg-[#3DDBD9]/10 text-[#3DDBD9] border border-[#3DDBD9]/30" : "bg-[#FF1744]/10 text-[#FF1744] border border-[#FF1744]/30"}`}>
                    {p.account_mode}
                  </span>
                </div>

                <div className="grid grid-cols-2 text-xs text-[#838C9C] gap-2 bg-[#0B0C10] p-3 rounded border border-[#1F2833]">
                  <div>Entry: <span className="text-white font-bold block mt-0.5">${p.entry_price}</span></div>
                  <div>Mark: <span className="text-white font-bold block mt-0.5">${p.current_mark_price}</span></div>
                  <div>SL: <span className="text-[#FF1744] font-bold block mt-0.5">${p.stop_loss || '0.00'}</span></div>
                  <div>TP: <span className="text-[#00E676] font-bold block mt-0.5">${p.take_profit || '0.00'}</span></div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t-2 border-[#1F2833] mt-2">
                  <div>
                    <div className="text-[10px] text-[#838C9C] font-bold uppercase tracking-wider">Unrealized PnL</div>
                    <div className={`text-base font-bold mt-0.5 ${p.unrealized_pnl >= 0 ? "text-[#00E676]" : "text-[#FF1744]"}`}>
                      {p.unrealized_pnl >= 0 ? `+$${p.unrealized_pnl.toFixed(2)}` : `-$${Math.abs(p.unrealized_pnl).toFixed(2)}`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleClosePosition(p.id, p.account_mode)}
                    className="px-4 py-2 bg-[#FF1744] hover:bg-red-600 text-white font-bold rounded text-xs transition-colors uppercase tracking-wider"
                  >
                    Close
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
