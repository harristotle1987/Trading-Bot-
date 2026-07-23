"use client";
import React, { useState, useEffect } from 'react';
import { getNvidiaTradeSignals, TradeSignal } from '../../services/nvidia_trader';

export default function AgentInsightPanel() {
  const [signals, setSignals] = useState<TradeSignal[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="bg-[#0B0C10] border-2 border-[#1F2833] rounded-lg p-4 space-y-4 font-mono">
      <h2 className="text-white font-bold tracking-widest uppercase flex items-center gap-2">
        <span className="text-[#FFD600]">NVIDIA</span> AI Trader
      </h2>
      {loading ? (
        <div className="text-[#838C9C] italic">Analyzing market...</div>
      ) : (
        <div className="space-y-3">
            {signals.map(s => (
            <div key={s.symbol} className="border border-[#1F2833] rounded p-3 bg-[#12161D] text-xs hover:border-[#3DDBD9] transition-colors">
                <div className="flex justify-between items-center mb-2">
                    <div className="text-white font-bold text-sm font-mono">{s.symbol}</div>
                    <div className={`font-bold font-mono ${s.type === 'UP' ? 'text-[#00E676]' : 'text-[#FF1744]'}`}>{s.type}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[#838C9C] font-mono">
                    <div>Entry: <span className="text-white">${s.entryPrice}</span></div>
                    <div>Win: <span className="text-white">{s.winRate}</span></div>
                    <div className="col-span-2">Close: <span className="text-white">{s.exitTime}</span></div>
                </div>
            </div>
            ))}
        </div>
      )}
    </div>
  );
}
