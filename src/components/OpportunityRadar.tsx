
"use client";
import React, { useState, useEffect } from 'react';

export default function OpportunityRadar() {
  const [opportunities, setOpportunities] = useState<any[]>([]);

  useEffect(() => {
    // Mock fetching from backend
    setOpportunities([
        { symbol: "BTCUSDT", bias: "LONG", entryTime: "10:05", exitTime: "10:45", winRate: "88%", score: 92.5, reasoning: "EMA 20/50 Cross + RSI" },
        { symbol: "ETHUSDT", bias: "LONG", entryTime: "10:15", exitTime: "11:00", winRate: "82%", score: 88.0, reasoning: "Volume Spike + Support" },
        { symbol: "EURUSD", bias: "SHORT", entryTime: "10:30", exitTime: "12:00", winRate: "75%", score: 75.2, reasoning: "Resistance Test" },
    ]);
  }, []);

  return (
    <div className="bg-[#0B0C10] border-2 border-[#1F2833] rounded-lg p-4 space-y-4">
      <h2 className="text-white font-bold tracking-widest uppercase flex items-center gap-2">
        <span className="text-[#3DDBD9]">⚡</span> Pair Radar
      </h2>
      {opportunities.map(opp => (
        <div key={opp.symbol} className="border border-[#1F2833] rounded p-3 bg-[#12161D] text-xs">
            <div className="flex justify-between items-center mb-2">
                <div className="text-white font-mono font-bold text-sm">{opp.symbol}</div>
                <div className={`font-bold ${opp.bias === 'LONG' ? 'text-[#00E676]' : 'text-[#FF1744]'}`}>{opp.bias}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[#838C9C] mb-2">
                <div>Entry: <span className="text-white">{opp.entryTime}</span></div>
                <div>Exit: <span className="text-white">{opp.exitTime}</span></div>
                <div>Win Rate: <span className="text-white">{opp.winRate}</span></div>
                <div>Score: <span className="text-white">{opp.score}%</span></div>
            </div>
            <div className="text-[#838C9C] italic">"{opp.reasoning}"</div>
        </div>
      ))}
    </div>
  );
}
