import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function AnalyticsDashboard() {
  const [activeTrades, setActiveTrades] = useState<any[]>([]);
  const [closedTrades, setClosedTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const [activeRes, closedRes] = await Promise.all([
          fetch("/api/trades/active", { cache: 'no-store' }),
          fetch("/api/trades/closed", { cache: 'no-store' })
        ]);
        if (activeRes.ok) setActiveTrades(await activeRes.json());
        if (closedRes.ok) setClosedTrades(await closedRes.json());
      } catch (err) {
        console.error("Failed to fetch trades for analytics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrades();
  }, []);

  // Compute stats
  const totalClosedPnL = closedTrades.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
  const totalActivePnL = activeTrades.reduce((sum, t) => sum + (t.unrealized_pnl || 0), 0);
  const totalPnL = totalClosedPnL + totalActivePnL;
  
  const winningTrades = closedTrades.filter(t => (t.realized_pnl || 0) > 0).length;
  const winRate = closedTrades.length > 0 ? ((winningTrades / closedTrades.length) * 100).toFixed(1) + "%" : "0.0%";

  // Create chart data out of closed trades over time
  // Assuming closed trades have a 'closed_at' timestamp or we just use their order to build an equity curve
  let runningPnL = 0;
  const chartData = closedTrades.map((t, idx) => {
    runningPnL += (t.realized_pnl || 0);
    return {
      tradeId: idx + 1,
      pnl: parseFloat(runningPnL.toFixed(2))
    };
  });

  if (chartData.length === 0) {
    chartData.push({ tradeId: 0, pnl: 0 }); // start at 0
  }

  // Calculate Max Drawdown
  let peak = 0;
  let maxDrawdown = 0;
  chartData.forEach(d => {
    if (d.pnl > peak) peak = d.pnl;
    const drawdown = peak - d.pnl;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Performance Analytics</h2>
      
      {loading ? (
        <div className="text-[#838C9C] font-mono">Loading real-time analytics...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "Net PnL (Closed + Active)", value: totalPnL >= 0 ? `+${totalPnL.toFixed(2)}` : `-${Math.abs(totalPnL).toFixed(2)}`, color: totalPnL >= 0 ? "text-[#00E676]" : "text-[#FF1744]" },
              { title: "Realized PnL", value: totalClosedPnL >= 0 ? `+${totalClosedPnL.toFixed(2)}` : `-${Math.abs(totalClosedPnL).toFixed(2)}`, color: totalClosedPnL >= 0 ? "text-[#00E676]" : "text-[#FF1744]" },
              { title: "Win Rate (Closed)", value: winRate, color: "text-white" },
              { title: "Max Drawdown", value: `${maxDrawdown.toFixed(2)}`, color: "text-white" },
            ].map((stat, i) => (
              <div key={i} className="bg-[#12161D] border border-[#232833] p-4 rounded-lg">
                <p className="text-[#838C9C] text-sm font-mono">{stat.title}</p>
                <p className={`text-2xl font-bold mt-1 font-mono \${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-[#12161D] border border-[#232833] p-6 rounded-lg">
            <h3 className="text-lg font-bold text-white mb-4 font-mono">Realized PnL Growth (Equity Curve)</h3>
            <div className="h-[300px] w-full">
              {closedTrades.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#232833" />
                    <XAxis dataKey="tradeId" stroke="#838C9C" tick={{fontSize: 12, fontFamily: 'monospace'}} />
                    <YAxis stroke="#838C9C" tick={{fontSize: 12, fontFamily: 'monospace'}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#12161D", borderColor: "#232833", color: "#fff", fontFamily: 'monospace' }}
                      formatter={(value: any) => [`${value}`, 'Running PnL']}
                      labelFormatter={(label: any) => `Trade #\${label}`}
                    />
                    <Line type="stepAfter" dataKey="pnl" stroke="#3DDBD9" strokeWidth={2} dot={{ r: 4, fill: '#12161D', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#3DDBD9' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-[#838C9C] font-mono border-2 border-dashed border-[#1F2833] rounded">
                  No closed trades yet to build equity curve.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
