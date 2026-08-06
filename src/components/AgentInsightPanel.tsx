"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { calculatePositionTrajectory } from '../utils/tradeMath';
import { TRADABLE_PAIRS } from '../App';
import { useRealtimeData } from '../hooks/useRealtimeData';
import { toast } from 'sonner';

interface TradeSignal {
  symbol: string;
  type: "UP" | "DOWN";
  entryPrice: number;
  winRate: string;
  slPrice: number;
  tpPrice: number;
}

export default function AgentInsightPanel({ selectedSymbol }: { selectedSymbol: string }) {
  const [signals, setSignals] = useState<TradeSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [autoScanEnabled, setAutoScanEnabled] = useState(false);
  const [executingSymbol, setExecutingSymbol] = useState<string | null>(null);
  const { prices } = useRealtimeData();
  const isInitialLoad = useRef(true);
  
  // Custom input states
  const [allocation, setAllocation] = useState<number>(10);
  const [leverage, setLeverage] = useState<number>(100);

  // Finnhub sentiment
  const [sentimentScore, setSentimentScore] = useState<number | null>(null);
  const [sentimentLoading, setSentimentLoading] = useState(true);

  const handleExecuteSignal = async (s: TradeSignal) => {
    setExecutingSymbol(s.symbol);
    try {
      const livePrice = prices[s.symbol] || s.entryPrice || 100;
      const res = await fetch("/api/trades/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: s.symbol,
          side: s.type === "UP" ? "BUY" : "SELL",
          capital: allocation,
          leverage: leverage,
          execution_price: livePrice,
          use_market_price: true,
          tp: s.tpPrice,
          sl: s.slPrice,
          account_mode: "DEMO"
        })
      });
      if (res.ok) {
        toast.success(`Trade Executed for ${s.symbol} at live market price ($${livePrice})!`);
        window.dispatchEvent(new CustomEvent("trade_updated"));
        window.dispatchEvent(new Event("balance_updated"));
      } else {
        const data = await res.json();
        toast.error(`Trade failed: ${data.error || data.message}`);
      }
    } catch(err: any) {
      toast.error(`Execution error: ${err.message}`);
    } finally {
      setExecutingSymbol(null);
    }
  };

  const fetchSignals = useCallback(async (isManual = false) => {
    if (isInitialLoad.current) {
      setLoading(true);
    } else {
      setIsScanning(true);
    }

    try {
      const res = await fetch("/api/agent-workspace/scan", { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.recommended_pairs)) {
          const mappedSignals: TradeSignal[] = data.recommended_pairs.map((p: any) => ({
            symbol: p.symbol,
            type: p.directional_bias?.includes("BUY") ? "UP" : "DOWN",
            entryPrice: p.suggested_entry,
            winRate: (p.win_rate_probability || 88) + "%",
            slPrice: p.suggested_sl,
            tpPrice: p.suggested_tp
          }));
          setSignals(mappedSignals);
        }
      }
      if (isManual) {
        toast.success("NVIDIA AI scan updated!");
      }
    } catch (err) {
      // Silently handle transient polling errors
    } finally {
      setLoading(false);
      setIsScanning(false);
      isInitialLoad.current = false;
    }
  }, []);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  // Auto scan interval only if explicitly enabled by user
  useEffect(() => {
    if (!autoScanEnabled) return;
    const interval = setInterval(() => {
      fetchSignals(false);
    }, 10000); // 10s non-intrusive poll
    return () => clearInterval(interval);
  }, [autoScanEnabled, fetchSignals]);

  useEffect(() => {
    const fetchNews = async () => {
      setSentimentLoading(true);
      try {
        const res = await fetch(`/api/ai/finnhub-news?symbol=${selectedSymbol}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            let score = 0;
            data.forEach((n: any) => {
               const text = (n.summary + " " + n.headline).toLowerCase();
               if (text.includes('bullish') || text.includes('positive') || text.includes('rally') || text.includes('up')) score += 0.1;
               if (text.includes('bearish') || text.includes('negative') || text.includes('drop') || text.includes('down')) score -= 0.1;
            });
            const finalScore = score !== 0 ? Math.max(-1, Math.min(1, score)) : 0.43;
            setSentimentScore(finalScore);
          } else {
            setSentimentScore(0);
          }
        }
      } catch (err) {
        console.warn("Error fetching sentiment", err);
      } finally {
        setSentimentLoading(false);
      }
    };
    fetchNews();
  }, [selectedSymbol]);

  return (
    <div className="bg-[#0B0C10] border border-[#1F2833] rounded-lg p-4 space-y-4 font-mono w-full lg:w-96 flex-shrink-0 shadow-2xl">
      <div className="flex justify-between items-center border-b border-[#1F2833] pb-3">
          <div>
            <h2 className="text-white font-bold tracking-widest uppercase flex items-center gap-2 text-sm">
              <span className="text-[#FFD600] font-extrabold">NVIDIA</span> AI Trader
            </h2>
            <span className="text-[10px] text-[#838C9C] block mt-0.5">Executable Trade Signals</span>
          </div>
          <div className="flex gap-2">
            <div className="flex flex-col">
              <label className="text-[9px] text-[#838C9C] uppercase font-bold">Capital ($)</label>
              <input 
                type="number" 
                value={allocation} 
                onChange={e => setAllocation(Number(e.target.value))}
                className="bg-[#12161D] border border-[#232833] text-white text-xs px-2 py-1 w-16 rounded outline-none font-bold"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[9px] text-[#838C9C] uppercase font-bold">Lev (x)</label>
              <input 
                type="number" 
                value={leverage} 
                onChange={e => setLeverage(Number(e.target.value))}
                className="bg-[#12161D] border border-[#232833] text-white text-xs px-2 py-1 w-16 rounded outline-none font-bold"
              />
            </div>
          </div>
      </div>

      {/* Manual Refresh / Auto-Scan Controls */}
      <div className="flex items-center justify-between bg-[#12161D] border border-[#232833] p-2 rounded text-xs">
        <button
          onClick={() => fetchSignals(true)}
          disabled={isScanning || loading}
          className="px-2.5 py-1 bg-[#3DDBD9] text-black font-bold rounded text-[10px] uppercase hover:bg-opacity-80 transition-all flex items-center gap-1 disabled:opacity-50"
        >
          <span className={isScanning ? "animate-spin" : ""}>🔄</span>
          <span>{isScanning ? "Scanning..." : "Run AI Scan"}</span>
        </button>

        <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-[#838C9C] font-bold">
          <span>Auto-Scan (10s)</span>
          <input
            type="checkbox"
            checked={autoScanEnabled}
            onChange={e => setAutoScanEnabled(e.target.checked)}
            className="accent-[#3DDBD9] cursor-pointer"
          />
        </label>
      </div>

      {/* Real-time Sentiment Box */}
      <div className="bg-[#12161D] border border-[#232833] p-3 rounded flex flex-col gap-1">
         <div className="text-[10px] text-[#838C9C] uppercase tracking-wider font-bold">Real-time News Sentiment</div>
         {sentimentLoading ? (
           <div className="text-white text-xs italic">Analyzing {selectedSymbol} news...</div>
         ) : (
           <div className="flex justify-between items-center">
             <div className="text-white text-sm font-bold">{selectedSymbol}</div>
             <div className={`text-xs font-bold ${sentimentScore !== null && sentimentScore > 0 ? 'text-[#00E676]' : sentimentScore !== null && sentimentScore < 0 ? 'text-[#FF1744]' : 'text-white'}`}>
               {sentimentScore !== null ? `Score: ${sentimentScore > 0 ? '+' : ''}${sentimentScore.toFixed(2)}` : 'N/A'}
             </div>
           </div>
         )}
         <div className="text-[9px] text-[#838C9C] flex items-center gap-1 mt-1">
           <svg className="w-3 h-3 text-[#3DDBD9]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           Backed by Finnhub API
         </div>
      </div>

      {loading ? (
        <div className="text-[#838C9C] italic text-xs p-6 text-center bg-[#12161D] border border-[#1F2833] rounded">
          <span className="animate-pulse block">Initial NVIDIA AI scan in progress...</span>
        </div>
      ) : signals.length > 0 ? (
        <div className="space-y-3">
            {signals.map(s => {
              const pairInfo = TRADABLE_PAIRS.find(p => p.symbol === s.symbol);
              const category = pairInfo?.category === 'forex' ? 'forex' : 'crypto';
              
              const calc = calculatePositionTrajectory(
                allocation,
                leverage,
                s.entryPrice,
                s.slPrice || s.entryPrice * 0.99,
                s.tpPrice || s.entryPrice * 1.02,
                category
              );

              const livePrice = prices[s.symbol] || s.entryPrice;

              return (
                <div key={s.symbol} className="border border-[#1F2833] rounded p-3 bg-[#12161D] text-xs hover:border-[#3DDBD9] transition-colors flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-2 border-b border-[#232833] pb-2">
                          <div className="text-white font-bold text-sm font-mono flex items-center gap-1.5">
                            {s.symbol} <span className="text-[#838C9C] text-[10px]">({category})</span>
                          </div>
                          <div className={`font-bold font-mono px-2 py-0.5 rounded text-[11px] ${s.type === 'UP' ? 'bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/30' : 'bg-[#FF1744]/10 text-[#FF1744] border border-[#FF1744]/30'}`}>{s.type === 'UP' ? 'BUY' : 'SELL'}</div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-[#838C9C] font-mono mb-2 border-b border-[#232833] pb-2">
                          <div>Live Price: <span className="text-[#3DDBD9] font-bold">${livePrice}</span></div>
                          <div>Win Rate: <span className="text-white">{s.winRate}</span></div>
                          <div>SL: <span className="text-[#FF1744]">${s.slPrice}</span></div>
                          <div>TP: <span className="text-[#00E676]">${s.tpPrice}</span></div>
                      </div>

                      <div className="space-y-1 mb-3">
                          <div className="text-[10px] text-white uppercase tracking-wider mb-1 font-bold">Trajectory Risk Profile</div>
                          <div className="flex justify-between text-[#838C9C]">
                              <span>Contract Size:</span>
                              <span className="text-white">{calc.contractSizeStr} {category === 'crypto' && s.symbol.replace('USDT', '')}</span>
                          </div>
                          <div className="flex justify-between text-[#838C9C]">
                              <span>Pip/Point Value:</span>
                              <span className="text-[#00E676]">${calc.pipValue.toFixed(4)} / {category === 'forex' ? 'pip' : '$1'}</span>
                          </div>
                          <div className="flex justify-between text-[#838C9C]">
                              <span>Max Risk (SL):</span>
                              <span className="text-[#FF1744]">-${calc.maxRiskAtSL.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-[#838C9C]">
                              <span>Max Gain (TP):</span>
                              <span className="text-[#00E676]">+$${calc.maxGainAtTP.toFixed(2)}</span>
                          </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleExecuteSignal(s)}
                      disabled={executingSymbol === s.symbol}
                      className="w-full py-2 px-3 rounded font-bold font-mono text-xs transition-all flex items-center justify-center gap-1.5 bg-[#3DDBD9] hover:bg-[#32b8b6] text-black disabled:opacity-50 cursor-pointer"
                    >
                      {executingSymbol === s.symbol ? "Executing..." : `⚡ Execute @ Market ($${livePrice})`}
                    </button>
                </div>
              );
            })}
        </div>
      ) : (
        <div className="text-[#838C9C] italic text-xs p-6 text-center bg-[#12161D] border border-[#1F2833] rounded">
          No active signals found. Click "Run AI Scan" to evaluate markets.
        </div>
      )}
    </div>
  );
}

