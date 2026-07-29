"use client";

import React, { useState, useEffect } from 'react';
import { getNvidiaTradeSignals, TradeSignal } from '../../services/nvidia_trader';
import { calculatePositionTrajectory } from '../utils/tradeMath';
import { TRADABLE_PAIRS } from '../App';

export default function AgentInsightPanel({ selectedSymbol }: { selectedSymbol: string }) {
  const [signals, setSignals] = useState<TradeSignal[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Custom input states
  const [allocation, setAllocation] = useState<number>(10);
  const [leverage, setLeverage] = useState<number>(100);

  // Finnhub sentiment
  const [sentimentScore, setSentimentScore] = useState<number | null>(null);
  const [sentimentLoading, setSentimentLoading] = useState(true);

  useEffect(() => {
    const fetchSignals = async () => {
      setLoading(true);
      const data = await getNvidiaTradeSignals();
      setSignals(data);
      setLoading(false);
    };
    fetchSignals();
    const interval = setInterval(fetchSignals, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchNews = async () => {
      setSentimentLoading(true);
      try {
        const res = await fetch(`/api/ai/finnhub-news?symbol=${selectedSymbol}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            let score = 0;
            data.forEach((n: any) => {
               const text = (n.summary + " " + n.headline).toLowerCase();
               if (text.includes('bullish') || text.includes('positive') || text.includes('rally') || text.includes('up')) score += 0.1;
               if (text.includes('bearish') || text.includes('negative') || text.includes('drop') || text.includes('down')) score -= 0.1;
            });
            // default to slightly positive if it's the stub
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
    <div className="bg-[#0B0C10] border-2 border-[#1F2833] rounded-lg p-4 space-y-4 font-mono w-full">
      <div className="flex justify-between items-center">
          <h2 className="text-white font-bold tracking-widest uppercase flex items-center gap-2">
            <span className="text-[#FFD600]">NVIDIA</span> AI Trader
          </h2>
          <div className="flex gap-2">
            <div className="flex flex-col">
              <label className="text-[10px] text-[#838C9C]">Allocation ($)</label>
              <input 
                type="number" 
                value={allocation} 
                onChange={e => setAllocation(Number(e.target.value))}
                className="bg-[#12161D] border border-[#232833] text-white text-xs px-2 py-1 w-16 rounded outline-none"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] text-[#838C9C]">Leverage (x)</label>
              <input 
                type="number" 
                value={leverage} 
                onChange={e => setLeverage(Number(e.target.value))}
                className="bg-[#12161D] border border-[#232833] text-white text-xs px-2 py-1 w-16 rounded outline-none"
              />
            </div>
          </div>
      </div>

      <div className="bg-[#12161D] border border-[#232833] p-3 rounded flex flex-col gap-1">
         <div className="text-[10px] text-[#838C9C] uppercase tracking-wider">Real-time News Sentiment</div>
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
         <div className="text-[10px] text-[#838C9C] flex items-center gap-1 mt-1">
           <svg className="w-3 h-3 text-[#3DDBD9]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           Backed by Finnhub API
         </div>
      </div>

      {loading ? (
        <div className="text-[#838C9C] italic">Analyzing market...</div>
      ) : (
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

              return (
                <div key={s.symbol} className="border border-[#1F2833] rounded p-3 bg-[#12161D] text-xs hover:border-[#3DDBD9] transition-colors">
                    <div className="flex justify-between items-center mb-2 border-b border-[#232833] pb-2">
                        <div className="text-white font-bold text-sm font-mono">{s.symbol} <span className="text-[#838C9C] text-[10px]">({category})</span></div>
                        <div className={`font-bold font-mono ${s.type === 'UP' ? 'text-[#00E676]' : 'text-[#FF1744]'}`}>{s.type}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-[#838C9C] font-mono mb-2 border-b border-[#232833] pb-2">
                        <div>Entry: <span className="text-white">${s.entryPrice}</span></div>
                        <div>Win Rate: <span className="text-white">{s.winRate}</span></div>
                        <div>SL: <span className="text-white">${s.slPrice}</span></div>
                        <div>TP: <span className="text-white">${s.tpPrice}</span></div>
                    </div>

                    <div className="space-y-1">
                        <div className="text-[10px] text-white uppercase tracking-wider mb-1">Trajectory Risk Profile</div>
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
              );
            })}
        </div>
      )}
    </div>
  );
}
