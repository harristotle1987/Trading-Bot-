"use client";
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function RiskDashboard() {
  const [metrics, setMetrics] = useState({
    totalExposure: 0,
    dailyPnL: 0,
    maxDrawdownCap: -5.0,
    activePositions: 0,
    maxPositions: 3
  });
  const [killSwitchActive, setKillSwitchActive] = useState(false);

  // Mocking live updates for the dashboard
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        totalExposure: Math.random() * 15000,
        dailyPnL: (Math.random() - 0.5) * 500,
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleKillSwitch = () => {
    setKillSwitchActive(true);
    toast.error("EMERGENCY KILL-SWITCH ENGAGED. ALL OPEN ORDERS CANCELLED.");
  };

  const drawdownPct = Math.min(100, Math.max(0, (metrics.dailyPnL < 0 ? Math.abs(metrics.dailyPnL) / 10000 * 100 : 0)));

  return (
    <div className="p-6 bg-[#0B0C10] text-[#C5C6C7] font-mono rounded-lg border-4 border-[#1F2833] max-w-4xl mx-auto shadow-2xl">
      <div className="flex justify-between items-center mb-6 border-b-2 border-[#1F2833] pb-4">
        <h2 className="text-2xl font-bold text-white tracking-widest uppercase">Risk Dashboard</h2>
        <div className="flex items-center space-x-3">
          <span className="text-sm font-semibold uppercase text-[#45A29E]">Status:</span>
          {killSwitchActive ? (
            <span className="px-3 py-1 bg-[#FF1744] text-white font-bold rounded">HALTED</span>
          ) : (
            <span className="px-3 py-1 bg-[#00E676] text-[#0B0C10] font-bold rounded">ACTIVE</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#1F2833] p-4 rounded border border-[#0B0C10] shadow-inner">
          <p className="text-sm text-[#66FCF1] uppercase mb-1">Total Exposure</p>
          <p className="text-3xl font-bold text-white">${metrics.totalExposure.toFixed(2)}</p>
        </div>
        
        <div className="bg-[#1F2833] p-4 rounded border border-[#0B0C10] shadow-inner">
          <p className="text-sm text-[#66FCF1] uppercase mb-1">Active Positions</p>
          <p className="text-3xl font-bold text-white">{metrics.activePositions} / {metrics.maxPositions}</p>
        </div>

        <div className="bg-[#1F2833] p-4 rounded border border-[#0B0C10] shadow-inner">
          <p className="text-sm text-[#66FCF1] uppercase mb-1">Daily PnL</p>
          <p className={`text-3xl font-bold ${metrics.dailyPnL >= 0 ? 'text-[#00E676]' : 'text-[#FF1744]'}`}>
            ${metrics.dailyPnL.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-[#45A29E] uppercase font-semibold">Daily Drawdown</span>
          <span className="text-white">{drawdownPct.toFixed(2)}% / {Math.abs(metrics.maxDrawdownCap)}% Limit</span>
        </div>
        <div className="w-full bg-[#1F2833] h-4 rounded overflow-hidden">
          <div 
            className={`h-full ${drawdownPct > 3.5 ? 'bg-[#FF1744]' : 'bg-[#00E676]'} transition-all duration-500 ease-in-out`}
            style={{ width: `${Math.min(100, (drawdownPct / Math.abs(metrics.maxDrawdownCap)) * 100)}%` }}
          />
        </div>
      </div>

      <div className="border-t-2 border-[#1F2833] pt-6 flex justify-end">
        <button 
          onClick={handleKillSwitch}
          disabled={killSwitchActive}
          className={`px-8 py-3 font-bold uppercase tracking-wider text-white border-2 transition-all ${
            killSwitchActive 
              ? 'bg-[#1F2833] border-[#1F2833] text-gray-500 cursor-not-allowed' 
              : 'bg-transparent border-[#FF1744] text-[#FF1744] hover:bg-[#FF1744] hover:text-white shadow-[0_0_15px_rgba(255,23,68,0.5)]'
          }`}
        >
          {killSwitchActive ? 'System Halted' : 'Emergency Kill-Switch'}
        </button>
      </div>
    </div>
  );
}
