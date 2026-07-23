"use client";
import React, { useState, useEffect } from 'react';
import OpportunityRadar from './OpportunityRadar';
import AgentInsightPanel from './AgentInsightPanel';

export default function AgentControlPanel() {
  const [status, setStatus] = useState<any>({
    status: "IDLE",
    uptime: 0,
    loop_latency: 0,
    total_trades: 0,
    session_pnl: 0.0
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/agent/status');
        const data = await res.json();
        if (mounted) setStatus(data);
      } catch (err) {
        if (err instanceof TypeError) { console.warn("Agent API offline (Server restarting)"); } else { console.error("Failed to fetch agent status", err); }
      }
    };
    
    fetchStatus();
    const interval = setInterval(fetchStatus, 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleAction = async (endpoint: string) => {
    setLoading(true);
    try {
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error(`Failed to execute ${endpoint}`, err);
    }
    setLoading(false);
  };

  const getStatusColor = () => {
    switch (status.status) {
      case "RUNNING": return "text-[#00E676]";
      case "PAUSED": return "text-yellow-400";
      case "EMERGENCY_STOP": return "text-[#FF1744]";
      default: return "text-gray-400";
    }
  };

  const getStatusBgColor = () => {
    switch (status.status) {
      case "RUNNING": return "bg-[#00E676]";
      case "PAUSED": return "bg-yellow-400";
      case "EMERGENCY_STOP": return "bg-[#FF1744]";
      default: return "bg-gray-400";
    }
  };

  return (
    <div className="flex flex-col h-full gap-6 w-full max-w-7xl mx-auto font-mono text-[#E6E9EF]">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-grow bg-[#0B0C10] p-6 rounded-lg border-4 border-[#1F2833] shadow-2xl flex-shrink-0">
          <h2 className="text-2xl font-bold text-white tracking-widest uppercase border-b-2 border-[#1F2833] pb-4 mb-6">Orchestrator Control Panel</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#1F2833] p-4 rounded border border-[#0B0C10] shadow-inner flex items-center justify-between col-span-2">
              <div>
                <p className="text-sm text-[#66FCF1] uppercase mb-1">Agent Status</p>
                <p className={`text-xl font-bold uppercase ${getStatusColor()}`}>{status.status}</p>
              </div>
              {status.status === "RUNNING" && (
                <div className={`w-4 h-4 rounded-full ${getStatusBgColor()} shadow-[0_0_10px_currentColor]`} />
              )}
            </div>
            
            <div className="bg-[#1F2833] p-4 rounded border border-[#0B0C10] shadow-inner">
              <p className="text-sm text-[#66FCF1] uppercase mb-1">Uptime (s)</p>
              <p className="text-xl font-bold text-white">{status.uptime}</p>
            </div>
            
            <div className="bg-[#1F2833] p-4 rounded border border-[#0B0C10] shadow-inner">
              <p className="text-sm text-[#66FCF1] uppercase mb-1">Total Trades</p>
              <p className="text-xl font-bold text-white">{status.total_trades}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 items-center justify-between border-t-2 border-[#1F2833] pt-6">
            <div className="flex gap-4">
              <button onClick={() => handleAction('/api/agent/start')} disabled={loading || status.status === "RUNNING"} className="px-6 py-2 font-bold uppercase text-white bg-[#1F2833] border-2 border-[#00E676] hover:bg-[#00E676] hover:text-[#0B0C10] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Start</button>
              <button onClick={() => handleAction('/api/agent/pause')} disabled={loading || status.status !== "RUNNING"} className="px-6 py-2 font-bold uppercase text-white bg-[#1F2833] border-2 border-yellow-400 hover:bg-yellow-400 hover:text-[#0B0C10] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Pause</button>
              <button onClick={() => handleAction('/api/agent/stop')} disabled={loading || status.status === "IDLE"} className="px-6 py-2 font-bold uppercase text-white bg-[#1F2833] border-2 border-gray-400 hover:bg-gray-400 hover:text-[#0B0C10] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Stop</button>
            </div>
            <button onClick={() => handleAction('/api/agent/kill-switch')} disabled={loading || status.status === "EMERGENCY_STOP"} className="px-8 py-2 font-bold uppercase tracking-widest text-white border-2 border-[#FF1744] hover:bg-[#FF1744] shadow-[0_0_15px_rgba(255,23,68,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all">Emergency Kill-Switch</button>
          </div>
        </div>

        <div className="w-full lg:w-1/3 min-h-0">
          <AgentInsightPanel />
        </div>
      </div>
      
      <div className="w-full">
        <OpportunityRadar />
      </div>
    </div>
  );
}
