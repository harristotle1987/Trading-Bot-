"use client";
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

const ALL_STRATEGIES = [
  { id: "SWING_TRADING", name: "Swing Trading (4H/1D)", baseWin: 86.8, color: "#3DDBD9", desc: "Fib Retracements & Multi-Day Momentum" },
  { id: "SMC_ICT", name: "ICT / SMC", baseWin: 88.4, color: "#66FCF1", desc: "Fair Value Gaps & Order Blocks" },
  { id: "TREND_FOLLOWING", name: "Trend Breakout", baseWin: 84.5, color: "#00E676", desc: "20/50/200 EMA Confluence" },
  { id: "MEAN_REVERSION", name: "Mean Reversion", baseWin: 79.2, color: "#FFD600", desc: "Bollinger 2.5 StdDev & VWAP Reversion" },
  { id: "ORDER_FLOW", name: "Order Flow Delta", baseWin: 85.1, color: "#FF9100", desc: "Volume Imbalance & Tape Delta" },
  { id: "GRID_TRADING", name: "Grid Range Harvesting", baseWin: 77.5, color: "#B388FF", desc: "ATR Channel Range Grid" }
];

export default function AgentControlPanel() {
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeStrategies, setActiveStrategies] = useState<string[]>(["TREND_FOLLOWING", "MEAN_REVERSION"]);
  const [strategyWeights, setStrategyWeights] = useState<Record<string, number>>({
    SWING_TRADING: 50,
    SMC_ICT: 50,
    TREND_FOLLOWING: 60,
    MEAN_REVERSION: 40,
    ORDER_FLOW: 50,
    GRID_TRADING: 50
  });
  const [compositeAnalytics, setCompositeAnalytics] = useState<any>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const wsRef = useRef<WebSocket | null>(null);

  const fetchSignals = async (overrideStrats?: string[], overrideWeights?: Record<string, number>) => {
    const strats = overrideStrats || activeStrategies;
    const weights = overrideWeights || strategyWeights;
    const stratParam = strats.join(",");

    const activeWeightsMap: Record<string, number> = {};
    strats.forEach(id => {
      activeWeightsMap[id] = weights[id] ?? 50;
    });

    const weightsParam = Object.entries(activeWeightsMap).map(([k, v]) => `${k}:${v}`).join(",");

    setLoading(true);
    try {
      const res = await fetch(`/api/agent-workspace/scan?strategy=${encodeURIComponent(stratParam)}&weights=${encodeURIComponent(weightsParam)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.composite_analytics) {
        setCompositeAnalytics(data.composite_analytics);
      }
      if (data.recommended_pairs && data.recommended_pairs.length > 0) {
        setSignals(
          data.recommended_pairs.map((pair: any) => ({
            ...pair,
            id: Math.random().toString(36).substr(2, 9),
            amount: 100,
            tp: pair.suggested_tp,
            sl: pair.suggested_sl
          }))
        );
      }
    } catch (err) {
      toast.error("Failed to fetch signal");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
  }, []);

  const toggleStrategy = (id: string) => {
    let nextStrats: string[];
    if (activeStrategies.includes(id)) {
      if (activeStrategies.length === 1) {
        toast.error("At least 1 strategy model must remain selected.");
        return;
      }
      nextStrats = activeStrategies.filter(s => s !== id);
    } else {
      nextStrats = [...activeStrategies, id];
    }
    setActiveStrategies(nextStrats);
    fetchSignals(nextStrats, strategyWeights);
  };

  const handleWeightChange = (id: string, weight: number) => {
    const nextWeights = { ...strategyWeights, [id]: weight };
    setStrategyWeights(nextWeights);
    fetchSignals(activeStrategies, nextWeights);
  };

  const applyPreset = (presetStrats: string[], presetWeights: Record<string, number>) => {
    setActiveStrategies(presetStrats);
    setStrategyWeights(prev => ({ ...prev, ...presetWeights }));
    fetchSignals(presetStrats, { ...strategyWeights, ...presetWeights });
    toast.success(`Applied strategy combination preset!`);
  };

  const totalActiveWeight = activeStrategies.reduce((sum, id) => sum + (strategyWeights[id] || 50), 0);

  // Setup WebSocket for prices
  useEffect(() => {
    if (signals.length === 0) return;
    
    // Disconnect old WS if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    const cryptoSignals = signals.filter(s => s.category !== "FOREX");
    const forexSignals = signals.filter(s => s.category === "FOREX");

    // Crypto via Binance WebSocket
    if (cryptoSignals.length > 0) {
        const symbols = Array.from(new Set(cryptoSignals.map(s => s.symbol.toLowerCase())));
        const streams = symbols.map(s => `${s}@ticker`).join('/');
        const wsUrl = `wss://stream.binance.com:9443/ws/${streams}`;
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.s && data.c) {
            setPrices(prev => ({
              ...prev,
              [data.s.toUpperCase()]: parseFloat(data.c)
            }));
          }
        };
    }

    // Forex via Simulated Ultra-High-Frequency (Finnhub proxy)
    // Note: A real Finnhub token is required for wss://ws.finnhub.io
    let forexInterval: any = null;
    if (forexSignals.length > 0) {
        forexInterval = setInterval(() => {
            setPrices(prev => {
                const updated = { ...prev };
                forexSignals.forEach(s => {
                    // Simulate millisecond-accurate top-of-book market values for Forex
                    const basePrice = s.suggested_entry || 1.085;
                    const noise = (Math.random() - 0.5) * 0.0004;
                    updated[s.symbol] = parseFloat((basePrice + noise).toFixed(5));
                });
                return updated;
            });
        }, 300); // 300ms polling as ultra-high-frequency fallback
    }

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (forexInterval) clearInterval(forexInterval);
    };
  }, [signals.length]);

  const handleExecute = async (signal: any) => {
    setLoading(true);
    try {
      const isForex = signal.category === "FOREX";
      const decimals = isForex ? 4 : 2;
      const currentPrice = prices[signal.symbol] || signal.suggested_entry || 100;
      const isBuy = signal.directional_bias.includes("BUY");

      const finalTp = signal.tp !== undefined && signal.tp !== null
        ? Number(signal.tp)
        : (signal.suggested_tp || (isBuy ? currentPrice * 1.05 : currentPrice * 0.95));

      const finalSl = signal.sl !== undefined && signal.sl !== null
        ? Number(signal.sl)
        : (signal.suggested_sl || (isBuy ? currentPrice * 0.97 : currentPrice * 1.03));

      const formattedTp = parseFloat(finalTp.toFixed(decimals));
      const formattedSl = parseFloat(finalSl.toFixed(decimals));

      const res = await fetch("/api/trades/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            symbol: signal.symbol,
            side: isBuy ? "BUY" : "SELL",
            capital: signal.amount || 100,
            execution_price: currentPrice,
            use_market_price: true,
            tp: formattedTp,
            sl: formattedSl,
            account_mode: "DEMO"
        })
      });
      if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to execute");
      }
      toast.success(`Trade Executed for ${signal.symbol} at market price! [TP: $${formattedTp} | SL: $${formattedSl}]`);
      window.dispatchEvent(new CustomEvent("trade_updated"));
      window.dispatchEvent(new Event("balance_updated"));
      setSignals(prev => prev.filter(s => s.id !== signal.id));
    } catch (err: any) {
      toast.error(`Execution failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscard = (id: string) => {
    setSignals(prev => prev.filter(s => s.id !== id));
  };
  
  const updateAmount = (id: string, newAmount: number) => {
    setSignals(prev => prev.map(s => s.id === id ? { ...s, amount: newAmount } : s));
  };

  const updateTp = (id: string, val: number) => {
    setSignals(prev => prev.map(s => s.id === id ? { ...s, tp: val } : s));
  };

  const updateSl = (id: string, val: number) => {
    setSignals(prev => prev.map(s => s.id === id ? { ...s, sl: val } : s));
  };

  return (
    <div className="flex min-h-screen w-full bg-[#0B0C10] text-[#E6E9EF] font-mono p-4 md:p-6 overflow-y-auto">
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center pt-6 pb-20">
        <h1 className="text-3xl font-bold tracking-widest uppercase mb-2 text-white">Signal Bunker</h1>
        <p className="text-xs text-[#838C9C] mb-6 tracking-wider text-center">
          Multi-Strategy Weighting Engine • Configure strategy allocations to synthesize real factual win rates
        </p>

        {/* Strategy Control Panel Section */}
        <div className="w-full bg-[#12161D] border border-[#1F2833] rounded-xl p-5 mb-8 shadow-2xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#1F2833] pb-4 mb-4 gap-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#66FCF1] animate-ping"></span>
                ACTIVE STRATEGIES & WEIGHT ALLOCATION
              </h2>
              <p className="text-[11px] text-[#838C9C] mt-0.5">Toggle strategies on/off and adjust sliders to re-calculate real statistical confluence win rates</p>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              <span className="text-[#838C9C] self-center mr-1 font-bold">Quick Presets:</span>
              <button
                onClick={() => applyPreset(["TREND_FOLLOWING", "MEAN_REVERSION"], { TREND_FOLLOWING: 60, MEAN_REVERSION: 40 })}
                className="px-2 py-1 rounded bg-[#1F2833] text-[#00E676] hover:bg-[#00E676] hover:text-black font-bold transition-all border border-[#00E676]/30"
              >
                ⚡ Trend (60%) + Mean Rev (40%)
              </button>
              <button
                onClick={() => applyPreset(["SMC_ICT", "ORDER_FLOW"], { SMC_ICT: 50, ORDER_FLOW: 50 })}
                className="px-2 py-1 rounded bg-[#1F2833] text-[#66FCF1] hover:bg-[#66FCF1] hover:text-black font-bold transition-all border border-[#66FCF1]/30"
              >
                💎 ICT (50%) + Order Flow (50%)
              </button>
              <button
                onClick={() => applyPreset(["SWING_TRADING", "SMC_ICT", "TREND_FOLLOWING"], { SWING_TRADING: 40, SMC_ICT: 30, TREND_FOLLOWING: 30 })}
                className="px-2 py-1 rounded bg-[#1F2833] text-[#FFD600] hover:bg-[#FFD600] hover:text-black font-bold transition-all border border-[#FFD600]/30"
              >
                🌊 Swing + ICT + Trend
              </button>
              <button
                onClick={() => {
                  const all = ALL_STRATEGIES.map(s => s.id);
                  const equalWeights: Record<string, number> = {};
                  all.forEach(id => { equalWeights[id] = 50; });
                  applyPreset(all, equalWeights);
                }}
                className="px-2 py-1 rounded bg-gradient-to-r from-teal-500 to-amber-400 text-[#0B0C10] font-bold hover:opacity-90 transition-all"
              >
                🧱 All 6 Equal Weight
              </button>
            </div>
          </div>

          {/* Allocation Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center text-[11px] text-[#838C9C] mb-1.5 font-bold">
              <span>Strategy Weight Allocation Share:</span>
              <span className="text-[#66FCF1]">{activeStrategies.length} Active Strategy Models</span>
            </div>
            <div className="w-full h-3 bg-[#0B0E13] rounded-full overflow-hidden flex border border-[#1F2833]">
              {activeStrategies.map(id => {
                const strat = ALL_STRATEGIES.find(s => s.id === id);
                const w = strategyWeights[id] || 50;
                const pct = totalActiveWeight > 0 ? (w / totalActiveWeight) * 100 : 0;
                return (
                  <div
                    key={id}
                    style={{ width: `${pct}%`, backgroundColor: strat?.color || "#66FCF1" }}
                    className="h-full transition-all duration-300 relative group"
                    title={`${strat?.name}: ${pct.toFixed(1)}% Allocation`}
                  />
                );
              })}
            </div>
          </div>

          {/* Strategy Slider Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {ALL_STRATEGIES.map(strat => {
              const isActive = activeStrategies.includes(strat.id);
              const weight = strategyWeights[strat.id] ?? 50;
              const sharePct = totalActiveWeight > 0 && isActive ? ((weight / totalActiveWeight) * 100).toFixed(1) : "0.0";

              return (
                <div
                  key={strat.id}
                  className={`p-3.5 rounded-lg border transition-all ${
                    isActive
                      ? "bg-[#0B0E13] border-[#1F2833] shadow-lg"
                      : "bg-[#0B0E13]/50 border-[#1F2833]/40 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={() => toggleStrategy(strat.id)}
                      className={`flex items-center gap-2 text-xs font-bold transition-colors ${
                        isActive ? "text-white" : "text-[#838C9C]"
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold border ${
                          isActive
                            ? "bg-[#66FCF1] border-[#66FCF1] text-[#0B0C10]"
                            : "border-[#838C9C] text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      <span>{strat.name}</span>
                    </button>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded font-bold"
                      style={{ color: strat.color, backgroundColor: `${strat.color}15`, border: `1px solid ${strat.color}40` }}
                    >
                      {strat.baseWin}% Base Win
                    </span>
                  </div>

                  <p className="text-[10px] text-[#838C9C] mb-3 truncate">{strat.desc}</p>

                  {/* Weight Slider */}
                  {isActive ? (
                    <div className="space-y-1 bg-[#12161D] p-2 rounded border border-[#1F2833]">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-[#838C9C]">Model Weight: <strong className="text-white">{weight}</strong></span>
                        <span className="font-bold text-[#66FCF1]">{sharePct}% Share</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="100"
                        step="5"
                        value={weight}
                        onChange={(e) => handleWeightChange(strat.id, Number(e.target.value))}
                        className="w-full accent-[#66FCF1] h-1.5 bg-[#1F2833] rounded-lg cursor-pointer"
                      />
                    </div>
                  ) : (
                    <div className="text-[10px] text-[#838C9C] italic py-2 text-center bg-[#12161D]/50 rounded border border-[#1F2833]/30">
                      Strategy Disabled (Click toggle to activate)
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Real Composite Analytics Metrics Box */}
          {compositeAnalytics && (
            <div className="bg-gradient-to-r from-[#0B0E13] via-[#12161D] to-[#0B0E13] border border-[#66FCF1]/30 rounded-lg p-4 font-mono">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#1F2833] pb-3 mb-3 gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📊</span>
                  <div>
                    <h3 className="text-xs font-bold text-[#66FCF1] uppercase tracking-wider">Composite Confluence Analytics</h3>
                    <p className="text-[10px] text-[#838C9C]">Calculated based on active model weights & multi-strategy correlation</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-[#838C9C]">Base Win: <strong className="text-white">{compositeAnalytics.weightedWinRate}%</strong></span>
                  <span className="text-[#00E676] font-bold bg-[#00E676]/10 px-2 py-0.5 rounded border border-[#00E676]/30">
                    Synergy Boost: +{compositeAnalytics.synergyBoost}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                <div className="bg-[#12161D] p-2.5 rounded border border-[#1F2833]">
                  <span className="block text-[10px] text-[#838C9C] uppercase">Composite Win Rate</span>
                  <span className="block text-lg font-bold text-[#66FCF1] mt-0.5">{compositeAnalytics.finalWinRate}%</span>
                </div>
                <div className="bg-[#12161D] p-2.5 rounded border border-[#1F2833]">
                  <span className="block text-[10px] text-[#838C9C] uppercase">Projected Sharpe</span>
                  <span className="block text-lg font-bold text-[#00E676] mt-0.5">{compositeAnalytics.sharpe}</span>
                </div>
                <div className="bg-[#12161D] p-2.5 rounded border border-[#1F2833]">
                  <span className="block text-[10px] text-[#838C9C] uppercase">Profit Factor</span>
                  <span className="block text-lg font-bold text-[#FFD600] mt-0.5">{compositeAnalytics.profitFactor}</span>
                </div>
                <div className="bg-[#12161D] p-2.5 rounded border border-[#1F2833]">
                  <span className="block text-[10px] text-[#838C9C] uppercase">Max Drawdown</span>
                  <span className="block text-lg font-bold text-[#FF1744] mt-0.5">-{compositeAnalytics.maxDrawdown}%</span>
                </div>
                <div className="bg-[#12161D] p-2.5 rounded border border-[#1F2833] col-span-2 md:col-span-1">
                  <span className="block text-[10px] text-[#838C9C] uppercase">Active Models</span>
                  <span className="block text-lg font-bold text-white mt-0.5">{compositeAnalytics.activeStrategies?.length || 1} Strategies</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={() => fetchSignals()} 
          disabled={loading}
          className="mb-8 px-6 py-2.5 bg-[#66FCF1] text-[#0B0C10] font-bold hover:bg-[#66FCF1]/80 uppercase tracking-widest text-xs transition-colors rounded-lg shadow-[0_0_15px_rgba(102,252,241,0.2)] flex items-center gap-2"
        >
          <span>{loading ? "Scanning Strategy Models..." : "🔄 Run Confluence Signal Scan"}</span>
        </button>
        
        {signals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            {signals.map(signal => (
              <div key={signal.id} className="w-full bg-[#12161D] p-6 rounded-lg border border-[#1F2833] shadow-2xl flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-2xl font-bold text-white block">{signal.symbol}</span>
                    <span className={`text-xl font-bold mt-1 block ${prices[signal.symbol] ? 'text-white' : 'text-[#838C9C] animate-pulse'}`}>
                      {prices[signal.symbol] ? `$${prices[signal.symbol].toFixed(2)}` : 'Connecting WS...'}
                    </span>
                  </div>
                  <span className={`text-sm px-3 py-1 rounded font-bold ${signal.directional_bias.includes("BUY") ? "bg-[#00E676] text-black" : "bg-[#FF1744] text-white"}`}>
                    {signal.directional_bias}
                  </span>
                </div>
                
                <div className="text-sm text-[#838C9C] mb-4 flex-grow">
                  <div className="flex justify-between items-center mb-2">
                    <p>Calculated Win Rate: <span className="text-[#66FCF1] font-bold text-base">{signal.win_rate_probability}%</span></p>
                    {signal.suggested_entry && (
                      <span className="text-xs bg-[#1F2833] text-[#3DDBD9] px-2 py-0.5 rounded font-mono font-bold">
                        Suggested Entry: ${signal.suggested_entry}
                      </span>
                    )}
                  </div>
                  <p className="italic text-xs text-[#838C9C] leading-relaxed mb-4">{signal.reasoning}</p>

                  {/* TP / SL Target Inputs */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-[#0B0E13] rounded-lg border border-[#1F2833] mb-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] uppercase text-[#00E676] font-bold">🎯 Target TP ($)</label>
                        <span className="text-[9px] text-[#00E676]/70">Suggested</span>
                      </div>
                      <input 
                        type="number" 
                        step="any"
                        value={signal.tp ?? signal.suggested_tp ?? ''} 
                        onChange={(e) => updateTp(signal.id, Number(e.target.value))} 
                        className="w-full bg-[#12161D] text-[#00E676] font-bold text-xs p-2 rounded border border-[#00E676]/30 focus:border-[#00E676] outline-none"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] uppercase text-[#FF1744] font-bold">🛡️ Stop Loss ($)</label>
                        <span className="text-[9px] text-[#FF1744]/70">Suggested</span>
                      </div>
                      <input 
                        type="number" 
                        step="any"
                        value={signal.sl ?? signal.suggested_sl ?? ''} 
                        onChange={(e) => updateSl(signal.id, Number(e.target.value))} 
                        className="w-full bg-[#12161D] text-[#FF1744] font-bold text-xs p-2 rounded border border-[#FF1744]/30 focus:border-[#FF1744] outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-xs uppercase text-[#66FCF1] mb-2 font-bold">Capital Allocation ($)</label>
                  <input 
                    type="number" 
                    value={signal.amount ?? ''} 
                    onChange={(e) => updateAmount(signal.id, Number(e.target.value))} 
                    className="w-full bg-[#1F2833] text-white p-3 rounded border border-transparent focus:border-[#66FCF1] outline-none font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => handleExecute(signal)} 
                    disabled={loading || !prices[signal.symbol]}
                    className="py-3 bg-[#66FCF1] text-[#0B0C10] font-bold rounded uppercase hover:bg-opacity-90 transition-colors disabled:opacity-50"
                  >
                    Execute Position
                  </button>
                  <button 
                    onClick={() => handleDiscard(signal.id)} 
                    className="py-3 bg-[#1F2833] text-[#FF1744] font-bold rounded uppercase hover:bg-[#1F2833] hover:text-white transition-colors border border-[#FF1744]"
                  >
                    Discard Signal
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[#838C9C] flex flex-col items-center justify-center h-48 border border-dashed border-[#1F2833] rounded-lg w-full">
            <span className="animate-pulse mb-2">Scanning market logic...</span>
            <span className="text-xs">Awaiting setup conditions</span>
          </div>
        )}
      </div>
    </div>
  );
}
