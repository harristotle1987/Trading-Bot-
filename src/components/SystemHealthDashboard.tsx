"use client";
import React, { useState, useEffect } from 'react';

export default function SystemHealthDashboard() {
  const [health, setHealth] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSystemData = async () => {
      try {
        const healthRes = await fetch('/api/system/health');
        const healthData = await healthRes.json();
        setHealth(healthData);
        setMaintenanceMode(healthData.status === "MAINTENANCE");

        const logsRes = await fetch('/api/system/audit-logs');
        const logsData = await logsRes.json();
        setAuditLogs(logsData.logs);
      } catch (err) {
        if (err instanceof TypeError) { console.warn("System Health API offline"); } else { console.error("Failed to fetch system data", err); }
      }
    };

    fetchSystemData();
    const interval = setInterval(fetchSystemData, 3000);
    return () => clearInterval(interval);
  }, []);

  const toggleMaintenance = async () => {
    setLoading(true);
    try {
      await fetch('/api/system/maintenance-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !maintenanceMode })
      });
      setMaintenanceMode(!maintenanceMode);
    } catch (err) {
      console.error("Failed to toggle maintenance mode", err);
    }
    setLoading(false);
  };

  const getServiceStatusColor = (status: string) => {
    if (status === "ONLINE" || status === "ACTIVE") return "text-[#00E676] bg-[#00E676]";
    if (status === "MAINTENANCE" || status === "IDLE") return "text-[#FFD600] bg-[#FFD600]";
    return "text-[#FF1744] bg-[#FF1744]";
  };

  const getLogColor = (level: string) => {
    if (level === "INFO") return "text-[#838C9C]";
    if (level === "WARN") return "text-[#FFD600]";
    if (level === "CRITICAL") return "text-[#FF1744]";
    return "text-[#E6E9EF]";
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto font-mono text-[#E6E9EF]">
      {/* Top Header & Controls */}
      <div className="flex items-center justify-between bg-[#0B0C10] p-6 rounded-lg border-4 border-[#1F2833] shadow-2xl">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-widest uppercase mb-1">System Command Center</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold uppercase text-[#45A29E]">Status:</span>
            {maintenanceMode ? (
              <span className="px-3 py-1 bg-[#FFD600] text-[#0B0C10] font-bold rounded text-xs animate-pulse">MAINTENANCE MODE</span>
            ) : health ? (
              <span className="px-3 py-1 bg-[#00E676] text-[#0B0C10] font-bold rounded text-xs">{health.status}</span>
            ) : (
              <span className="px-3 py-1 bg-[#838C9C] text-[#0B0C10] font-bold rounded text-xs">CONNECTING...</span>
            )}
          </div>
        </div>
        <div>
          <button 
            onClick={toggleMaintenance}
            disabled={loading}
            className={`px-6 py-2 font-bold uppercase tracking-wider text-white border-2 transition-colors ${
              maintenanceMode 
                ? 'bg-[#1F2833] border-[#FFD600] text-[#FFD600] hover:bg-[#FFD600] hover:text-[#0B0C10]' 
                : 'bg-[#1F2833] border-[#838C9C] hover:border-white'
            }`}
          >
            {maintenanceMode ? 'Disable Maintenance' : 'Enable Maintenance'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Infrastructure Health Grid */}
        <div className="col-span-1 md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
          {health && Object.entries(health.services).map(([key, svc]: [string, any]) => (
            <div key={key} className="bg-[#0B0C10] p-4 rounded-lg border-2 border-[#1F2833] shadow-inner flex flex-col justify-between h-32 relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-full h-1 ${getServiceStatusColor(svc.status).split(' ')[1]}`} />
              <p className="text-xs text-[#66FCF1] uppercase font-bold z-10">{key.replace('_', ' ')}</p>
              
              <div className="flex items-center justify-between mt-auto z-10">
                <span className={`text-sm font-bold uppercase flex items-center gap-2 ${getServiceStatusColor(svc.status).split(' ')[0]}`}>
                  <div className={`w-2 h-2 rounded-full ${getServiceStatusColor(svc.status).split(' ')[1]} ${svc.status === 'ONLINE' || svc.status === 'ACTIVE' ? 'animate-pulse' : ''}`} />
                  {svc.status}
                </span>
                <span className="text-xs text-[#838C9C]">{svc.latency}ms</span>
              </div>
            </div>
          ))}
        </div>

        {/* Resource & Latency Monitor */}
        <div className="bg-[#0B0C10] p-4 rounded-lg border-2 border-[#1F2833] shadow-inner col-span-1 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-[#66FCF1] uppercase border-b border-[#1F2833] pb-2">Host Metrics</h3>
          {health && (
            <>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#838C9C]">CPU Usage</span>
                  <span className="text-white">{health.system_metrics.cpu_usage_pct}%</span>
                </div>
                <div className="w-full bg-[#1F2833] h-1.5 rounded overflow-hidden">
                  <div className="bg-[#3DDBD9] h-full" style={{ width: `${health.system_metrics.cpu_usage_pct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#838C9C]">RAM Usage</span>
                  <span className="text-white">{health.system_metrics.ram_usage_mb} MB</span>
                </div>
                <div className="w-full bg-[#1F2833] h-1.5 rounded overflow-hidden">
                  <div className="bg-[#3DDBD9] h-full" style={{ width: `${(health.system_metrics.ram_usage_mb / 2048) * 100}%` }} />
                </div>
              </div>
              <div className="mt-auto">
                <p className="text-[10px] text-[#838C9C] uppercase">Uptime</p>
                <p className="text-sm font-bold text-white">{formatUptime(health.system_metrics.uptime_seconds)}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Security Audit Log Viewer */}
      <div className="bg-[#0B0C10] p-6 rounded-lg border-4 border-[#1F2833] shadow-2xl flex-1 flex flex-col min-h-[300px]">
        <div className="flex items-center justify-between mb-4 border-b-2 border-[#1F2833] pb-4">
          <h3 className="text-lg font-bold text-white tracking-widest uppercase flex items-center gap-2">
            <svg className="w-5 h-5 text-[#838C9C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Security Audit Logs
          </h3>
          <span className="text-xs bg-[#1F2833] px-2 py-1 rounded text-[#838C9C]">Immutable Ledger</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#232833] text-[#45A29E] uppercase">
                <th className="py-2 px-4 font-normal">Timestamp</th>
                <th className="py-2 px-4 font-normal">Level</th>
                <th className="py-2 px-4 font-normal">Action</th>
                <th className="py-2 px-4 font-normal">User</th>
                <th className="py-2 px-4 font-normal">IP Address</th>
                <th className="py-2 px-4 font-normal">Details</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {auditLogs.map((log) => {
                const timeStr = new Date(log.timestamp).toISOString().replace('T', ' ').replace('Z', '');
                return (
                  <tr key={log.id} className="border-b border-[#1F2833] hover:bg-[#12161D] transition-colors">
                    <td className="py-2 px-4 text-[#838C9C] whitespace-nowrap">{timeStr}</td>
                    <td className={`py-2 px-4 font-bold ${getLogColor(log.level)}`}>[{log.level}]</td>
                    <td className="py-2 px-4 text-[#E6E9EF]">{log.action}</td>
                    <td className="py-2 px-4 text-[#3DDBD9]">{log.user}</td>
                    <td className="py-2 px-4 text-[#838C9C]">{log.ip}</td>
                    <td className="py-2 px-4 text-[#E6E9EF] w-full">{log.details}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
