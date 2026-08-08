import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebaseClient';
import { 
  Zap, Sparkles, RefreshCw, CheckCircle2, Clock, 
  TrendingUp, TrendingDown, ShieldAlert, Layers, Cpu, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

export interface StrategySweepDoc {
  sweepId: string;
  symbol: string;
  timeframe: string;
  status: 'processing' | 'completed' | 'failed';
  createdAt: number;
  completedAt?: number;
  winningStrategy?: string;
  winRate?: number;
  recommendation?: {
    action: 'STRONG BUY' | 'BUY' | 'STRONG SELL' | 'SELL' | 'NEUTRAL';
    entry: number;
    tp: number;
    sl: number;
    synergyBoost: number;
    reasoning: string;
  };
  allStrategyMetrics?: Array<{
    name: string;
    winRate: number;
    profitFactor: number;
    maxDrawdown: number;
    sharpeRatio: number;
    compositeScore?: number;
  }>;
  error?: string;
}

export async function runMultiStrategySweep(symbol: string = 'BTCUSDT', timeframe: string = '15m') {
  const toastId = toast.loading(`Initiating Multi-Strategy Sweep for ${symbol}...`);
  try {
    const res = await fetch('/api/agent/strategy-sweep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, timeframe })
    });
    const data = await res.json();
    if (data.success) {
      toast.success('Sweep running in background... You can close this tab', {
        id: toastId,
        duration: 5000,
        description: `Analyzing 500+ OHLCV bars across 5 strategy algorithms for ${symbol}.`
      });
      return data.sweepId;
    } else {
      toast.error(`Sweep failed: ${data.error || 'Unknown error'}`, { id: toastId });
    }
  } catch (err: any) {
    toast.error(`Sweep trigger error: ${err.message}`, { id: toastId });
  }
}

export function TriggerSweepButton({ 
  symbol = 'BTCUSDT', 
  timeframe = '15m', 
  className = '',
  size = 'md' 
}: { 
  symbol?: string; 
  timeframe?: string; 
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [isRunning, setIsRunning] = useState(false);

  const handleClick = async () => {
    if (isRunning) return;
    setIsRunning(true);
    await runMultiStrategySweep(symbol, timeframe);
    setTimeout(() => setIsRunning(false), 3000);
  };

  const py = size === 'sm' ? 'py-1.5 px-3 text-xs' : size === 'lg' ? 'py-3 px-6 text-sm font-extrabold' : 'py-2.5 px-4 text-xs font-bold';

  return (
    <button
      onClick={handleClick}
      disabled={isRunning}
      className={`relative group overflow-hidden rounded-xl bg-gradient-to-r from-[#3DDBD9] to-[#00E676] text-[#0B0E13] font-mono tracking-wider uppercase transition-all duration-300 shadow-[0_0_20px_rgba(61,219,217,0.3)] hover:shadow-[0_0_30px_rgba(0,230,118,0.5)] hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 ${py} ${className}`}
    >
      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
      <Cpu size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} className={`relative z-10 ${isRunning ? 'animate-spin' : 'animate-pulse'}`} />
      <span className="relative z-10">
        {isRunning ? 'Sweep Running...' : 'RUN MULTI-STRATEGY SWEEP'}
      </span>
      <Sparkles size={size === 'sm' ? 12 : 14} className="relative z-10 text-[#0B0E13]" />
    </button>
  );
}

export default function StrategySweepDashboard({ selectedSymbol = 'BTCUSDT', selectedTimeframe = '15m' }: { selectedSymbol?: string; selectedTimeframe?: string }) {
  const [sweeps, setSweeps] = useState<StrategySweepDoc[]>([]);
  const [activeTab, setActiveTab] = useState<'latest' | 'history'>('latest');
  const [isListening, setIsListening] = useState(false);

  // Firestore real-time snapshot listener on strategy_sweeps
  useEffect(() => {
    try {
      const q = query(
        collection(db, 'strategy_sweeps'),
        orderBy('createdAt', 'desc'),
        limit(10)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: StrategySweepDoc[] = snapshot.docs.map((doc) => doc.data() as StrategySweepDoc);
          setSweeps(list);
          setIsListening(true);
        },
        (err) => {
          console.warn('Firestore onSnapshot fallback to API fetch:', err);
          fetchFallbackSweeps();
        }
      );

      return () => unsubscribe();
    } catch (e) {
      console.warn('Firestore init failed, falling back to REST endpoint:', e);
      fetchFallbackSweeps();
    }
  }, []);

  const fetchFallbackSweeps = async () => {
    try {
      const res = await fetch('/api/agent/strategy-sweep/latest');
      if (res.ok) {
        const data = await res.json();
        if (data.sweeps) {
          setSweeps(data.sweeps);
        }
      }
    } catch (err) {
      // ignore
    }
  };

  const latestSweep = sweeps[0];

  return (
    <div className="bg-[#12161D] border border-[#232833] rounded-2xl p-4 md:p-6 shadow-2xl relative overflow-hidden font-sans space-y-6">
      {/* Background Accent Mesh */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#3DDBD9]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-[#00E676]/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#232833] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-[#3DDBD9]/20 to-[#00E676]/20 border border-[#3DDBD9]/40 text-[#3DDBD9]">
            <Layers size={22} className="text-[#3DDBD9]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white tracking-wide font-mono uppercase">
                Multi-Strategy Sweep Engine
              </h2>
              {isListening && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#00E676]/10 border border-[#00E676]/30 text-[#00E676] text-[10px] font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse"></span>
                  LIVE FIRESTORE
                </span>
              )}
            </div>
            <p className="text-xs text-[#838C9C] font-mono">
              Simultaneous 500-Bar Backtest Sweep across 5 Active Algorithms
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <TriggerSweepButton symbol={selectedSymbol} timeframe={selectedTimeframe} />
        </div>
      </div>

      {/* Main Content Area */}
      {sweeps.length === 0 ? (
        <div className="py-12 px-4 text-center rounded-xl bg-[#0B0E13]/60 border border-[#232833] flex flex-col items-center justify-center space-y-3">
          <div className="p-4 rounded-full bg-[#181D26] text-[#3DDBD9] border border-[#232833]">
            <Cpu size={32} />
          </div>
          <h3 className="text-sm font-bold text-white font-mono uppercase">No Strategy Sweeps Triggered Yet</h3>
          <p className="text-xs text-[#838C9C] max-w-md">
            Click <strong className="text-[#3DDBD9]">RUN MULTI-STRATEGY SWEEP</strong> above to run 500-bar backtest simulations simultaneously across Swing Trading, ICT/SMC, Trend Breakout, Grid Harvesting, and Mean Reversion.
          </p>
          <TriggerSweepButton symbol={selectedSymbol} timeframe={selectedTimeframe} size="lg" className="mt-2" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active / Processing Banner */}
          {latestSweep?.status === 'processing' && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#3DDBD9]/10 via-[#181D26] to-[#00E676]/10 border border-[#3DDBD9]/40 flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse">
              <div className="flex items-center gap-3">
                <RefreshCw size={24} className="text-[#3DDBD9] animate-spin" />
                <div>
                  <div className="text-sm font-bold text-white font-mono flex items-center gap-2">
                    <span>Sweeping 500 Candles for {latestSweep.symbol} [{latestSweep.timeframe}]...</span>
                  </div>
                  <span className="text-xs text-[#838C9C]">
                    Simulating Swing Trading, ICT/SMC, Trend Breakout, Grid Range, and Mean Reversion in background. You can close this tab.
                  </span>
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-[#3DDBD9]/20 border border-[#3DDBD9]/40 text-[#3DDBD9] text-xs font-mono font-bold whitespace-nowrap">
                Job ID: {latestSweep.sweepId.slice(0, 14)}...
              </div>
            </div>
          )}

          {/* AI Recommendation Hero Box */}
          {latestSweep?.status === 'completed' && latestSweep.recommendation && (
            <div className="p-5 rounded-2xl bg-gradient-to-b from-[#181D26] to-[#0B0E13] border border-[#232833] space-y-4 shadow-xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#232833] pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-[#3DDBD9]" />
                  <span className="text-xs font-mono font-extrabold text-[#3DDBD9] tracking-wider uppercase">
                    AI Winning Recommendation
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#00E676]/20 border border-[#00E676]/40 text-[#00E676] text-[10px] font-mono font-bold">
                    {latestSweep.winningStrategy}
                  </span>
                </div>
                <div className="text-[11px] text-[#838C9C] font-mono flex items-center gap-2">
                  <Clock size={12} />
                  <span>{new Date(latestSweep.completedAt || latestSweep.createdAt).toLocaleTimeString()}</span>
                  <span>({latestSweep.symbol} • {latestSweep.timeframe})</span>
                </div>
              </div>

              {/* Action & Core Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Action Box */}
                <div className="p-3.5 rounded-xl bg-[#12161D] border border-[#232833] flex flex-col justify-between">
                  <span className="text-[10px] font-mono text-[#838C9C] uppercase font-bold">Market Direction</span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-lg font-mono font-extrabold text-sm tracking-wider flex items-center gap-1.5 ${
                      latestSweep.recommendation.action.includes('BUY')
                        ? 'bg-[#00E676]/20 border border-[#00E676]/50 text-[#00E676]'
                        : latestSweep.recommendation.action.includes('SELL')
                        ? 'bg-[#FF1744]/20 border border-[#FF1744]/50 text-[#FF1744]'
                        : 'bg-[#FFC107]/20 border border-[#FFC107]/50 text-[#FFC107]'
                    }`}>
                      {latestSweep.recommendation.action.includes('BUY') ? (
                        <TrendingUp size={16} />
                      ) : latestSweep.recommendation.action.includes('SELL') ? (
                        <TrendingDown size={16} />
                      ) : (
                        <AlertTriangle size={16} />
                      )}
                      {latestSweep.recommendation.action}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#00E676] mt-2 font-bold">
                    +{latestSweep.recommendation.synergyBoost}% Synergy Confluence
                  </span>
                </div>

                {/* Entry Price */}
                <div className="p-3.5 rounded-xl bg-[#12161D] border border-[#232833] flex flex-col justify-between">
                  <span className="text-[10px] font-mono text-[#838C9C] uppercase font-bold">Suggested Entry</span>
                  <div className="mt-1 text-base font-extrabold font-mono text-white">
                    ${latestSweep.recommendation.entry.toLocaleString()}
                  </div>
                  <span className="text-[10px] font-mono text-[#838C9C]">Live Price Trigger</span>
                </div>

                {/* Take Profit (TP) */}
                <div className="p-3.5 rounded-xl bg-[#12161D] border border-[#00E676]/30 flex flex-col justify-between">
                  <span className="text-[10px] font-mono text-[#00E676] uppercase font-bold">Take Profit (TP)</span>
                  <div className="mt-1 text-base font-extrabold font-mono text-[#00E676]">
                    ${latestSweep.recommendation.tp.toLocaleString()}
                  </div>
                  <span className="text-[10px] font-mono text-[#00E676]">Target Level</span>
                </div>

                {/* Stop Loss (SL) */}
                <div className="p-3.5 rounded-xl bg-[#12161D] border border-[#FF1744]/30 flex flex-col justify-between">
                  <span className="text-[10px] font-mono text-[#FF1744] uppercase font-bold">Stop Loss (SL)</span>
                  <div className="mt-1 text-base font-extrabold font-mono text-[#FF1744]">
                    ${latestSweep.recommendation.sl.toLocaleString()}
                  </div>
                  <span className="text-[10px] font-mono text-[#FF1744]">Protection Level</span>
                </div>

                {/* Win Rate */}
                <div className="p-3.5 rounded-xl bg-[#12161D] border border-[#3DDBD9]/30 flex flex-col justify-between">
                  <span className="text-[10px] font-mono text-[#3DDBD9] uppercase font-bold">Win Rate</span>
                  <div className="mt-1 text-base font-extrabold font-mono text-[#3DDBD9]">
                    {latestSweep.winRate}%
                  </div>
                  <span className="text-[10px] font-mono text-[#3DDBD9]">500-Bar Backtest</span>
                </div>
              </div>

              {/* Confluence Rationale */}
              <div className="p-3.5 rounded-xl bg-[#12161D] border border-[#232833] space-y-1">
                <span className="text-[10px] font-mono text-[#838C9C] uppercase font-bold flex items-center gap-1">
                  <CheckCircle2 size={12} className="text-[#00E676]" /> Confluence Rationale
                </span>
                <p className="text-xs text-[#E6E9EF] font-mono leading-relaxed">
                  {latestSweep.recommendation.reasoning}
                </p>
              </div>
            </div>
          )}

          {/* All Strategy Metrics Table */}
          {latestSweep?.allStrategyMetrics && latestSweep.allStrategyMetrics.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Cpu size={14} className="text-[#3DDBD9]" /> Multi-Strategy Sweep Results Breakdown
                </h3>
                <span className="text-[11px] text-[#838C9C] font-mono">
                  {latestSweep.allStrategyMetrics.length} Strategies Evaluated
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {latestSweep.allStrategyMetrics.map((strat, idx) => {
                  const isWinner = strat.name === latestSweep.winningStrategy;
                  return (
                    <div
                      key={strat.name}
                      className={`p-4 rounded-xl border transition-all ${
                        isWinner
                          ? 'bg-[#181D26] border-[#3DDBD9] shadow-[0_0_15px_rgba(61,219,217,0.2)]'
                          : 'bg-[#12161D] border-[#232833] hover:border-[#3DDBD9]/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="font-mono text-xs font-bold text-white flex items-center gap-1.5">
                            {isWinner && <Sparkles size={13} className="text-[#3DDBD9]" />}
                            <span>{strat.name}</span>
                          </div>
                          {isWinner && (
                            <span className="text-[10px] font-mono font-bold text-[#3DDBD9] uppercase">
                              ★ Highest Composite Score
                            </span>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-extrabold ${
                          strat.winRate >= 80 ? 'bg-[#00E676]/20 text-[#00E676]' : 'bg-[#3DDBD9]/20 text-[#3DDBD9]'
                        }`}>
                          {strat.winRate}% Win
                        </span>
                      </div>

                      {/* Progress Bar for Win Rate */}
                      <div className="w-full h-1.5 bg-[#232833] rounded-full overflow-hidden mb-3">
                        <div
                          className={`h-full ${isWinner ? 'bg-gradient-to-r from-[#3DDBD9] to-[#00E676]' : 'bg-[#3DDBD9]'}`}
                          style={{ width: `${strat.winRate}%` }}
                        ></div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[10px] font-mono pt-2 border-t border-[#232833]">
                        <div>
                          <span className="text-[#838C9C] block">Profit Factor</span>
                          <span className="text-white font-bold">{strat.profitFactor}</span>
                        </div>
                        <div>
                          <span className="text-[#838C9C] block">Max DD</span>
                          <span className="text-[#FF1744] font-bold">{strat.maxDrawdown}%</span>
                        </div>
                        <div>
                          <span className="text-[#838C9C] block">Sharpe</span>
                          <span className="text-[#00E676] font-bold">{strat.sharpeRatio}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
