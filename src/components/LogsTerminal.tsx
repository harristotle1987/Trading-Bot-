"use client";
import React, { useState, useEffect } from 'react';

export default function LogsTerminal() {
  const [logs, setLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    // We can simulate fetching logs or fetch from /api/system/audit-logs
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/system/audit-logs');
        const data = await res.json();
        setLogs(data.logs || []);
      } catch (err) {
        console.error("Failed to fetch logs", err);
      }
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter(log => {
    if (filter !== 'ALL' && log.level !== filter) return false;
    if (search && !log.message.toLowerCase().includes(search.toLowerCase()) && !log.module.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
        + "Timestamp,Level,Module,Message\n"
        + filteredLogs.map(e => `${e.timestamp},${e.level},${e.module},"${e.message}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "system_logs.csv");
    document.body.appendChild(link);
    link.click();
  };

  const getLogColor = (level: string) => {
    if (level === 'INFO') return 'text-[#838C9C]';
    if (level === 'WARN') return 'text-[#FFD600]';
    if (level === 'CRITICAL' || level === 'ERROR') return 'text-[#FF1744]';
    return 'text-[#E6E9EF]';
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto h-full font-mono text-[#E6E9EF]">
      <div className="flex flex-col gap-4 bg-[#0B0C10] p-6 rounded-lg border-[4px] border-[#1F2833] shadow-2xl">
        <div className="flex justify-between items-center border-b-2 border-[#1F2833] pb-4">
            <h2 className="text-2xl font-bold text-white tracking-widest uppercase flex items-center gap-2">
                <svg className="w-6 h-6 text-[#3DDBD9]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                System Logs
            </h2>
            <button onClick={handleExportCSV} className="bg-[#1F2833] text-[#3DDBD9] px-4 py-2 rounded text-xs font-bold hover:bg-[#3DDBD9] hover:text-[#0B0C10] transition-colors uppercase tracking-widest">
                Export CSV
            </button>
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-center">
            <input 
                type="text" 
                placeholder="Search logs..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-[#12161D] border-2 border-[#1F2833] rounded px-4 py-2 text-sm w-full focus:outline-none focus:border-[#3DDBD9]"
            />
            <div className="flex gap-2 w-full md:w-auto">
                {['ALL', 'INFO', 'WARN', 'ERROR'].map(lvl => (
                    <button 
                        key={lvl}
                        onClick={() => setFilter(lvl)}
                        className={`px-4 py-2 rounded text-xs font-bold uppercase transition-colors whitespace-nowrap ${filter === lvl ? 'bg-[#3DDBD9] text-[#0B0C10]' : 'bg-[#1F2833] text-[#838C9C] hover:text-white'}`}
                    >
                        {lvl}
                    </button>
                ))}
            </div>
        </div>
      </div>

      <div className="bg-[#0B0C10] p-6 rounded-lg border-[4px] border-[#1F2833] shadow-2xl flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto pr-2">
            <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-[#12161D] text-[#838C9C] uppercase sticky top-0 z-10">
                    <tr>
                        <th className="p-3 border-b border-[#1F2833]">Timestamp</th>
                        <th className="p-3 border-b border-[#1F2833]">Level</th>
                        <th className="p-3 border-b border-[#1F2833]">Module</th>
                        <th className="p-3 border-b border-[#1F2833]">Message</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredLogs.map((log, i) => (
                        <tr key={i} className="border-b border-[#1F2833] hover:bg-[#12161D] transition-colors">
                            <td className="p-3 text-[#838C9C] whitespace-nowrap">{new Date(log.timestamp).toISOString()}</td>
                            <td className={`p-3 font-bold ${getLogColor(log.level)}`}>[{log.level}]</td>
                            <td className="p-3 text-[#3DDBD9] whitespace-nowrap">{log.module}</td>
                            <td className="p-3">{log.message}</td>
                        </tr>
                    ))}
                    {filteredLogs.length === 0 && (
                        <tr>
                            <td colSpan={4} className="p-12 text-center text-[#838C9C] uppercase tracking-widest border-dashed border-2 border-[#1F2833] rounded">
                                No logs found.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}
