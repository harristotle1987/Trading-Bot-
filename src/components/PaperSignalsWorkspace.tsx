import { useState, useEffect } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { 
  Zap, TrendingUp, ShieldAlert, Award, Clock, Activity, 
  BarChart3, RefreshCw, Layers, CheckCircle2, XCircle, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

interface SignalRecord {
  signal_id: string;
  symbol: string;
  timeframe: string;
  direction: string;
  entry: number;
  timestamp: number;
  market_regime: string;
  strategy_results?: {
    strategyUsed?: string;
    indicators?: string[];
    winRateProbability?: number;
  };
  signal_score: number;
  expected_value: number;
  ml_probability: number | null;
  expiry: number;
  outcome: string;
  outcome_price: number | null;
  result: string | null;
  R_multiple: number | null;
  payout: number | null;
  duration: number | null;
  created_at: string;
  resolved_at: string | null;
}

interface PaperStatsResponse {
  status: string;
  metrics: {
    signalsGenerated: number;
    resolvedCount: number;
    wins: number;
    losses: number;
    winRate: number;
    expectancy: number;
    profitFactor: number;
    drawdownProxy: number;
  };
  performance: {
    byAsset: Array<{ name: string; count: number; winRate: number; expectancy: number }>;
    byTimeframe: Array<{ name: string; count: number; winRate: number; expectancy: number }>;
    byStrategy: Array<{ name: string; count: number; winRate: number; expectancy: number }>;
    byRegime: Array<{ name: string; count: number; winRate: number; expectancy: number }>;
    byScoreBucket: Array<{ name: string; count: number; winRate: number; expectancy: number }>;
    byMLBucket: Array<{ name: string; count: number; winRate: number; expectancy: number }>;
  };
  signals: SignalRecord[];
}

export default function PaperSignalsWorkspace() {
  const [data, setData] = useState<PaperStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollingInterval, setPollingInterval] = useState(3000); // 3s
  const [activeTab, setActiveTab] = useState<"asset" | "timeframe" | "strategy" | "regime" | "score" | "ml">("asset");

  const fetchStats = async (isManual = false) => {
    try {
      const res = await fetch("/api/paper/stats");
      if (!res.ok) throw new Error("Failed to load paper stats");
      const json = await res.json();
      setData(json);
      if (isManual) {
        toast.success("Paper Signal Metrics Updated!");
      }
    } catch (err: any) {
      console.error(err);
      if (isManual) toast.error("Error refreshing stats: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => {
      fetchStats();
    }, pollingInterval);
    return () => clearInterval(interval);
  }, [pollingInterval]);

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-zinc-400">
        <Activity className="animate-spin text-[#3DDBD9] mb-4" size={32} />
        <p className="text-sm">Loading Paper Signal Database...</p>
      </div>
    );
  }

  const { metrics, performance, signals } = data;
  const isMeaningful = metrics.resolvedCount >= 30;

  // Custom Chart Colors
  const COLORS = ["#3DDBD9", "#00E676", "#FF9100", "#D500F9", "#2979FF"];

  // Mapping active breakdown data
  let activeBreakdownData: Array<{ name: string; count: number; winRate: number; expectancy: number }> = [];
  if (activeTab === "asset") activeBreakdownData = performance.byAsset;
  else if (activeTab === "timeframe") activeBreakdownData = performance.byTimeframe;
  else if (activeTab === "strategy") activeBreakdownData = performance.byStrategy;
  else if (activeTab === "regime") activeBreakdownData = performance.byRegime;
  else if (activeTab === "score") activeBreakdownData = performance.byScoreBucket;
  else if (activeTab === "ml") activeBreakdownData = performance.byMLBucket;

  // Render a simple countdown or status for unresolved signals
  const renderRemainingTime = (sig: SignalRecord) => {
    const remaining = Math.max(0, sig.expiry - Date.now());
    if (remaining <= 0) {
      return <span className="text-xs text-zinc-500">Resolving...</span>;
    }
    const secs = Math.ceil(remaining / 1000);
    return (
      <span className="text-xs font-mono text-[#3DDBD9] flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[#3DDBD9] animate-ping" />
        {secs}s left
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12 w-full max-w-7xl mx-auto" id="paper-signal-workspace">
      
      {/* 🔴 Giant Warning/Label Mode Banner */}
      <div className="bg-gradient-to-r from-red-950/40 via-red-900/20 to-transparent border border-red-800/60 rounded-xl p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 text-xs font-black bg-red-600 text-white rounded-md tracking-wider animate-pulse">
              PAPER SIGNAL MODE
            </span>
            <span className="text-[#3DDBD9] text-xs font-mono flex items-center gap-1.5">
              <Activity size={14} className="animate-spin" />
              Live Real-Time Execution Filter Active
            </span>
          </div>
          <p className="text-zinc-300 text-sm max-w-2xl mt-1.5">
            The quantitative engine is actively consuming real-time market data feeds to analyze setups, evaluate confluence levels, and record forward test signals. No trades are executed on any broker account.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button 
            onClick={() => fetchStats(true)} 
            className="p-2.5 bg-[#12161D] hover:bg-[#1C2330] border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-all"
            title="Force refresh stats"
          >
            <RefreshCw size={16} />
          </button>
          <div className="bg-[#12161D] border border-zinc-800 rounded-lg p-2 flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-mono">POLL:</span>
            <select 
              value={pollingInterval} 
              onChange={(e) => setPollingInterval(Number(e.target.value))}
              className="bg-transparent text-xs text-[#3DDBD9] font-mono border-none outline-none cursor-pointer"
            >
              <option value={2000}>2s</option>
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
            </select>
          </div>
        </div>
      </div>

      {/* ⚠️ Statistical Significance Warning */}
      {!isMeaningful ? (
        <div className="bg-amber-950/30 border border-amber-800/40 text-amber-200/90 rounded-lg p-4 flex gap-3 text-sm">
          <ShieldAlert className="flex-shrink-0 text-amber-400 mt-0.5" size={20} />
          <div className="space-y-1">
            <h4 className="font-semibold text-white">Statistical Significance Warning</h4>
            <p className="text-zinc-300 text-xs leading-relaxed">
              Current resolved paper signals count: <span className="font-bold font-mono text-amber-400">{metrics.resolvedCount}</span>. A minimum sample size of <span className="font-bold font-mono">30</span> resolved signals is mathematically required to establish a robust significance baseline ($N \ge 30$). Refrain from treating early out-of-sample win rates as indicators of long-term commercial performance.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-950/20 border border-emerald-800/40 text-emerald-200/90 rounded-lg p-4 flex gap-3 text-sm">
          <CheckCircle2 className="flex-shrink-0 text-emerald-400 mt-0.5" size={20} />
          <div className="space-y-1">
            <h4 className="font-semibold text-white">Statistical Baseline Reached</h4>
            <p className="text-zinc-300 text-xs leading-relaxed">
              The out-of-sample forward dataset has met the minimum sample size criteria ($N = {metrics.resolvedCount} \ge 30$). The calculated expectancy and profit factors are now statistically representative of system efficacy on live asset streams.
            </p>
          </div>
        </div>
      )}

      {/* 📊 High Contrast Key Metric Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-[#12161D] border border-[#232833] rounded-xl p-4 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs uppercase font-semibold tracking-wider">Generated Signals</span>
            <Layers size={16} className="text-[#3DDBD9]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black font-mono text-white">{metrics.signalsGenerated}</h3>
            <p className="text-[10px] text-zinc-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E676]" />
              {metrics.resolvedCount} resolved out-of-sample
            </p>
          </div>
        </div>

        <div className="bg-[#12161D] border border-[#232833] rounded-xl p-4 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs uppercase font-semibold tracking-wider">Out-Of-Sample Win Rate</span>
            <TrendingUp size={16} className="text-[#00E676]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black font-mono text-[#00E676]">
              {metrics.winRate}%
            </h3>
            <p className="text-[10px] text-zinc-400">
              {metrics.wins} Wins / {metrics.losses} Losses
            </p>
          </div>
        </div>

        <div className="bg-[#12161D] border border-[#232833] rounded-xl p-4 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs uppercase font-semibold tracking-wider">Statistical Expectancy</span>
            <Award size={16} className="text-[#FF9100]" />
          </div>
          <div className="space-y-1">
            <h3 className={`text-2xl font-black font-mono ${metrics.expectancy >= 0 ? "text-[#00E676]" : "text-red-500"}`}>
              {metrics.expectancy > 0 ? "+" : ""}{metrics.expectancy} R
            </h3>
            <p className="text-[10px] text-zinc-400">
              Average R-multiple returned per setup
            </p>
          </div>
        </div>

        <div className="bg-[#12161D] border border-[#232833] rounded-xl p-4 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs uppercase font-semibold tracking-wider">Profit Factor / Drawdown</span>
            <Clock size={16} className="text-blue-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black font-mono text-white">
              {metrics.profitFactor}x
            </h3>
            <p className="text-[10px] text-zinc-400">
              Max Drawdown Proxy: <span className="text-red-400 font-bold">{metrics.drawdownProxy}%</span>
            </p>
          </div>
        </div>

      </div>

      {/* 📈 Charts & Statistical Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Breakdown Control Menu (Left side on large screens) */}
        <div className="bg-[#12161D] border border-[#232833] rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart3 size={16} className="text-[#3DDBD9]" />
              Performance Breakdowns
            </h3>
            <p className="text-zinc-400 text-xs mt-1">
              Analyze statistical attributes across distinct dimensional categories.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            {[
              { id: "asset", label: "By Asset Symbol" },
              { id: "timeframe", label: "By Expiry Timeframe" },
              { id: "strategy", label: "By System Strategy" },
              { id: "regime", label: "By Market Regime" },
              { id: "score", label: "By Signal Score Bucket" },
              { id: "ml", label: "By ML Probability Bucket" },
            ].map((b) => (
              <button
                key={b.id}
                onClick={() => setActiveTab(b.id as any)}
                className={`w-full px-4 py-3 rounded-lg text-left text-xs transition-all flex items-center justify-between ${
                  activeTab === b.id 
                    ? "bg-[#181D26] border border-zinc-700 font-bold text-[#3DDBD9]" 
                    : "bg-transparent hover:bg-zinc-800/40 text-zinc-400 hover:text-white border border-transparent"
                }`}
              >
                <span>{b.label}</span>
                <span className="text-[10px] opacity-70 font-mono uppercase">
                  {b.id === activeTab ? "Active" : "View"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Visualizer Chart & Statistics Table (Right 2 cols) */}
        <div className="lg:col-span-2 bg-[#12161D] border border-[#232833] rounded-xl p-5 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {activeTab.toUpperCase()} Win Rate Breakdown
              </h3>
              <span className="text-[10px] text-zinc-500 font-mono">
                RESOLVED SETUP DISTRIBUTIONS
              </span>
            </div>
            
            {/* Chart Area */}
            <div className="h-56 mt-4 w-full">
              {activeBreakdownData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-500 text-xs">
                  No resolved signals available for this category yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activeBreakdownData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F242E" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#838C9C" 
                      fontSize={11} 
                      tickLine={false} 
                    />
                    <YAxis 
                      stroke="#838C9C" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      domain={[0, 100]}
                      unit="%"
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      contentStyle={{ background: '#12161D', borderColor: '#232833', borderRadius: '8px' }}
                      labelClassName="text-white text-xs font-bold"
                    />
                    <Bar dataKey="winRate" name="Win Rate" radius={[4, 4, 0, 0]}>
                      {activeBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Mini Table inside Chart Container */}
          <div className="overflow-x-auto border-t border-zinc-800/80 pt-4">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
                  <th className="pb-2">Grouping</th>
                  <th className="pb-2 text-center">Setups Count</th>
                  <th className="pb-2 text-center">Out-of-Sample Win Rate</th>
                  <th className="pb-2 text-right">Expectancy (R)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40 text-xs font-mono">
                {activeBreakdownData.map((d, i) => (
                  <tr key={i} className="hover:bg-zinc-800/20">
                    <td className="py-2 text-zinc-300 font-semibold">{d.name}</td>
                    <td className="py-2 text-center text-zinc-400">{d.count}</td>
                    <td className="py-2 text-center text-[#00E676]">{d.winRate}%</td>
                    <td className={`py-2 text-right ${d.expectancy >= 0 ? "text-[#00E676]" : "text-red-400"}`}>
                      {d.expectancy > 0 ? "+" : ""}{d.expectancy} R
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

      </div>

      {/* 🔴 Continuous Signal Stream Table */}
      <div className="bg-[#12161D] border border-[#232833] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Continuous Live Signal Stream
            </h3>
            <p className="text-zinc-400 text-xs mt-1">
              Active forward trading logs updated in real time. Hover to view indicators.
            </p>
          </div>
          <span className="text-xs bg-[#1F242E] text-zinc-400 px-3 py-1.5 rounded-md font-mono border border-zinc-800">
            LATEST 50 LOGS
          </span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono border-b border-zinc-800/80 pb-2">
                <th className="pb-3 pl-2">Signal ID</th>
                <th className="pb-3">Symbol</th>
                <th className="pb-3">Type / Time</th>
                <th className="pb-3">Market Regime</th>
                <th className="pb-3 text-center">Score / EV</th>
                <th className="pb-3 text-center">ML Forecast</th>
                <th className="pb-3">Entry Price</th>
                <th className="pb-3">Outcome Price</th>
                <th className="pb-3 pr-2 text-right">Resolution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40 text-xs font-mono">
              {signals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-zinc-500">
                    Listening for real live price tick updates to formulate signals...
                  </td>
                </tr>
              ) : (
                signals.map((sig) => {
                  const isCall = sig.direction === "CALL" || sig.direction === "BUY";
                  return (
                    <tr key={sig.signal_id} className="hover:bg-[#181D26] transition-colors group">
                      
                      {/* Signal ID */}
                      <td className="py-3 pl-2 text-zinc-400 group-hover:text-[#3DDBD9] transition-colors">
                        {sig.signal_id}
                      </td>

                      {/* Symbol */}
                      <td className="py-3 text-white font-bold">
                        {sig.symbol}
                      </td>

                      {/* Type / Timeframe */}
                      <td className="py-3">
                        <div className="flex flex-col">
                          <span className={`font-black ${isCall ? "text-[#00E676]" : "text-[#FF1744]"}`}>
                            {isCall ? "CALL ↗" : "PUT ↘"}
                          </span>
                          <span className="text-[10px] text-zinc-400">{sig.timeframe} expiry</span>
                        </div>
                      </td>

                      {/* Regime */}
                      <td className="py-3 text-zinc-300">
                        <span className="px-2 py-0.5 bg-zinc-800/80 rounded border border-zinc-700 text-[10px] uppercase text-zinc-400">
                          {sig.market_regime.replace("_", " ")}
                        </span>
                      </td>

                      {/* Score / EV */}
                      <td className="py-3 text-center">
                        <div className="flex flex-col">
                          <span className="text-zinc-200 font-semibold">{sig.signal_score} pts</span>
                          <span className="text-[10px] text-amber-500">+{sig.expected_value} EV</span>
                        </div>
                      </td>

                      {/* ML Forecast */}
                      <td className="py-3 text-center">
                        {sig.ml_probability ? (
                          <div className="inline-block px-2 py-0.5 rounded bg-zinc-800/60 border border-zinc-700 text-zinc-300 text-[11px]">
                            {(sig.ml_probability * 100).toFixed(1)}%
                          </div>
                        ) : (
                          <span className="text-zinc-600">-</span>
                        )}
                      </td>

                      {/* Entry Price */}
                      <td className="py-3 text-zinc-300">
                        ${parseFloat(Number(sig.entry).toFixed(5))}
                      </td>

                      {/* Outcome Price */}
                      <td className="py-3 text-zinc-400">
                        {sig.outcome_price ? `$${parseFloat(Number(sig.outcome_price).toFixed(5))}` : "-"}
                      </td>

                      {/* Resolution / Countdown */}
                      <td className="py-3 pr-2 text-right">
                        {sig.outcome === "UNRESOLVED" ? (
                          renderRemainingTime(sig)
                        ) : sig.outcome === "WIN" ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/60 text-[#00E676] font-bold text-[10px]">
                            WIN (+1.0 R)
                          </span>
                        ) : sig.outcome === "LOSS" ? (
                          <span className="px-2 py-0.5 rounded bg-red-950/40 border border-red-800/60 text-[#FF1744] font-bold text-[10px]">
                            LOSS (-1.0 R)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-500 text-[10px] uppercase">
                            {sig.outcome}
                          </span>
                        )}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
