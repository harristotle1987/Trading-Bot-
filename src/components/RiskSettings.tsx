"use client";
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function RiskSettings() {
  const [activeTab, setActiveTab] = useState<'RISK' | 'REBALANCE' | 'HEALTH' | 'AUTO'>('RISK');
  
  const [autoTrade, setAutoTrade] = useState({
      active: false,
      min_profit_threshold: 0.75,
      trade_capital_alloc: 1000,
      sl_threshold_pct: 0.02,
      tp_threshold_pct: 0.06,
      max_daily_loss: 500
  });

  const handleAutoTradeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value, type, checked } = e.target;
      setAutoTrade(prev => ({
          ...prev,
          [name]: type === 'checkbox' ? checked : parseFloat(value) || 0
      }));
  };

  const [rebalanceSuggestions, setRebalanceSuggestions] = useState<any[]>([]);
  const [rebalanceLoading, setRebalanceLoading] = useState(false);

  const [diagnostics, setDiagnostics] = useState<any[]>([]);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [showErrorLog, setShowErrorLog] = useState<Record<string, boolean>>({});

  const fetchDiagnostics = async () => {
      setDiagnosticsLoading(true);
      try {
          const res = await fetch('/api/health/diagnostics');
          const data = await res.json();
          if (data.status === 'SUCCESS') {
              setDiagnostics(data.diagnostics);
              toast.success('Diagnostics completed.');
          } else {
              toast.error('Failed to run diagnostics.');
          }
      } catch (err) {
          console.warn(err);
          toast.error('Failed to ping diagnostics.');
      } finally {
          setDiagnosticsLoading(false);
      }
  };

  const fetchRebalance = async () => {
    setRebalanceLoading(true);
    try {
        // Fetch balances
        const balRes = await fetch('/api/account/balances');
        const balances = await balRes.json();
        const totalEquity = balances.demo.total_equity;

        // Fetch active positions
        const posRes = await fetch('/api/trades/active');
        const positions = await posRes.json();

        // Target: 50% BTC, 50% ETH (Simplified)
        const targetBtc = totalEquity * 0.5;
        const targetEth = totalEquity * 0.5;

        // Simplified calculation based on current positions
        const currentBtc = positions.filter((p: any) => p.symbol.includes('BTC')).reduce((acc: number, p: any) => acc + (p.size * p.current_mark_price), 0);
        const currentEth = positions.filter((p: any) => p.symbol.includes('ETH')).reduce((acc: number, p: any) => acc + (p.size * p.current_mark_price), 0);

        setRebalanceSuggestions([
            { symbol: 'BTCUSDT', target: targetBtc, current: currentBtc, action: targetBtc > currentBtc ? 'BUY' : 'SELL', diff: Math.abs(targetBtc - currentBtc) },
            { symbol: 'ETHUSDT', target: targetEth, current: currentEth, action: targetEth > currentEth ? 'BUY' : 'SELL', diff: Math.abs(targetEth - currentEth) }
        ]);
        toast.success('Rebalance calculation complete.');
    } catch (err) {
        toast.error('Failed to calculate rebalance.');
        console.warn(err);
    } finally {
        setRebalanceLoading(false);
    }
  };
  const [settings, setSettings] = useState({
    max_concurrent_trades: 3,
    max_daily_drawdown_pct: 0.05,
    max_spread_pct: 0.001,
    default_risk_pct: 0.01,
    default_trade_amount: 100,
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/risk/settings')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setSettings({
              max_concurrent_trades: data.max_concurrent_trades ?? 3,
              max_daily_drawdown_pct: data.max_daily_drawdown_pct ?? 0.05,
              max_spread_pct: data.max_spread_pct ?? 0.001,
              default_risk_pct: data.default_risk_pct ?? 0.01,
              default_trade_amount: data.default_trade_amount ?? 100
          });
          if (data.autoTrade) {
              setAutoTrade(prev => ({ ...prev, ...data.autoTrade }));
          }
        }
      })
      .catch(err => console.warn("Failed to load settings:", err));
  }, []);

  const handleRiskChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/risk/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, autoTrade })
      });
      if (res.ok) {
        toast.success('Settings saved successfully.');
        setMessage('Settings saved successfully.');
      } else {
        toast.error('Failed to save settings.');
        setMessage('Failed to save settings.');
      }
    } catch (err: any) {
      toast.error(`Error saving settings: ${err.message}`);
      setMessage('Error saving settings.');
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto font-mono text-[#E6E9EF]">
      <div className="bg-[#0B0C10] p-6 rounded-lg border-[4px] border-[#1F2833] shadow-2xl">
        <div className="flex items-center justify-between border-b-2 border-[#1F2833] pb-4 mb-6">
            <h2 className="text-2xl font-bold text-white tracking-widest uppercase">System Settings</h2>
            {message && (
              <span className={`text-sm ${message.includes('Error') || message.includes('Failed') ? 'text-[#FF1744]' : 'text-[#00E676]'} animate-pulse`}>
                {message}
              </span>
            )}
        </div>
        
        <div className="flex gap-4 mb-6 border-b border-[#1F2833] pb-4 overflow-x-auto">
            <button 
                onClick={async () => {
                  const res = await fetch('/api/account/balance/reset', { method: 'POST' });
                  if (res.ok) {
                    setMessage('Balance reset to $10,000');
                    setTimeout(() => setMessage(''), 3000);
                  }
                }}
                className="px-4 py-2 uppercase font-bold text-sm transition-colors whitespace-nowrap text-[#FF1744] hover:text-red-300 border-r border-[#1F2833]"
            >
                Reset Demo Balance
            </button>
            <button 
                onClick={() => setActiveTab('RISK')} 
                className={`px-4 py-2 uppercase font-bold text-sm transition-colors whitespace-nowrap ${activeTab === 'RISK' ? 'text-[#3DDBD9] border-b-2 border-[#3DDBD9]' : 'text-[#838C9C] hover:text-white'}`}
            >
                Risk Parameters
            </button>
            <button 
                onClick={() => { setActiveTab('REBALANCE'); fetchRebalance(); }}
                className={`px-4 py-2 uppercase font-bold text-sm transition-colors whitespace-nowrap ${activeTab === 'REBALANCE' ? 'text-[#3DDBD9] border-b-2 border-[#3DDBD9]' : 'text-[#838C9C] hover:text-white'}`}
            >
                Quick Rebalance
            </button>
            <button 
                onClick={() => { setActiveTab('HEALTH'); fetchDiagnostics(); }}
                className={`px-4 py-2 uppercase font-bold text-sm transition-colors whitespace-nowrap ${activeTab === 'HEALTH' ? 'text-[#3DDBD9] border-b-2 border-[#3DDBD9]' : 'text-[#838C9C] hover:text-white'}`}
            >
                API Health
            </button>
            <button 
                onClick={() => setActiveTab('AUTO')} 
                className={`px-4 py-2 uppercase font-bold text-sm transition-colors whitespace-nowrap ${activeTab === 'AUTO' ? 'text-[#3DDBD9] border-b-2 border-[#3DDBD9]' : 'text-[#838C9C] hover:text-white'}`}
            >
                Auto-Trade
            </button>
        </div>

        <div className="space-y-6">
            {activeTab === 'HEALTH' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                       <h3 className="text-lg font-bold text-[#E6E9EF]">Connection Diagnostics</h3>
                       <button onClick={fetchDiagnostics} disabled={diagnosticsLoading} className="bg-[#12161D] text-[#3DDBD9] border border-[#1F2833] px-4 py-2 rounded text-xs font-bold uppercase hover:bg-[#1F2833] transition-colors disabled:opacity-50">
                           {diagnosticsLoading ? 'Pinging...' : 'Test All Connections'}
                       </button>
                    </div>
                    {diagnostics.length === 0 && !diagnosticsLoading && (
                        <div className="text-[#838C9C] text-sm italic">Run diagnostics to check API health...</div>
                    )}
                    {diagnostics.length > 0 && (
                        <div className="space-y-4">
                           {diagnostics.map((d, idx) => (
                               <div key={idx} className="bg-[#12161D] p-4 rounded border border-[#1F2833]">
                                   <div className="flex justify-between items-center">
                                       <span className="font-bold text-[#E6E9EF]">{d.name}</span>
                                       <div className="flex items-center gap-4">
                                            {d.latency !== null && (
                                                <span className="text-xs text-[#838C9C]">{d.latency}ms</span>
                                            )}
                                            <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded ${
                                                d.status === 'Connected' ? 'bg-green-500/10 text-green-400' :
                                                d.status === 'Degraded' ? 'bg-yellow-500/10 text-yellow-400' :
                                                'bg-red-500/10 text-red-400'
                                            }`}>
                                                {d.status}
                                            </span>
                                       </div>
                                   </div>
                                   {d.error && (
                                       <div className="mt-3">
                                           <button 
                                                onClick={() => setShowErrorLog(prev => ({...prev, [d.name]: !prev[d.name]}))}
                                                className="text-[10px] text-red-400 hover:text-red-300 underline uppercase"
                                           >
                                                {showErrorLog[d.name] ? 'Hide Error Log' : 'Show Error Log'}
                                           </button>
                                           {showErrorLog[d.name] && (
                                               <pre className="mt-2 p-2 bg-[#0B0C10] border border-red-500/20 text-red-400 text-[10px] overflow-x-auto rounded">
                                                   {d.error}
                                               </pre>
                                           )}
                                       </div>
                                   )}
                               </div>
                           ))}
                        </div>
                    )}
                </div>
            )}
            
             {activeTab === 'RISK' && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between">
                        <label className="text-xs text-[#838C9C] uppercase tracking-wider font-bold">Max Concurrent Trades</label>
                        <span className="text-[#3DDBD9] text-sm font-bold">{settings.max_concurrent_trades}</span>
                    </div>
                    <input
                      type="range"
                      name="max_concurrent_trades"
                      min="1"
                      max="10"
                      step="1"
                      value={settings.max_concurrent_trades}
                      onChange={handleRiskChange}
                      className="w-full accent-[#3DDBD9]"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between">
                        <label className="text-xs text-[#838C9C] uppercase tracking-wider font-bold">Max Daily Drawdown</label>
                        <span className="text-[#3DDBD9] text-sm font-bold">{(settings.max_daily_drawdown_pct * 100).toFixed(1)}%</span>
                    </div>
                    <input
                      type="range"
                      name="max_daily_drawdown_pct"
                      min="0.01"
                      max="0.20"
                      step="0.01"
                      value={settings.max_daily_drawdown_pct}
                      onChange={handleRiskChange}
                      className="w-full accent-[#3DDBD9]"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between">
                        <label className="text-xs text-[#838C9C] uppercase tracking-wider font-bold">Max Spread Tolerance (%)</label>
                        <span className="text-[#3DDBD9] text-sm font-bold">{(settings.max_spread_pct * 100).toFixed(3)}%</span>
                    </div>
                    <input
                      type="range"
                      name="max_spread_pct"
                      min="0.0001"
                      max="0.0100"
                      step="0.0001"
                      value={settings.max_spread_pct}
                      onChange={handleRiskChange}
                      className="w-full accent-[#3DDBD9]"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between">
                        <label className="text-xs text-[#838C9C] uppercase tracking-wider font-bold">Default Risk per Trade</label>
                        <span className="text-[#3DDBD9] text-sm font-bold">{(settings.default_risk_pct * 100).toFixed(1)}%</span>
                    </div>
                    <input
                      type="range"
                      name="default_risk_pct"
                      min="0.001"
                      max="0.05"
                      step="0.001"
                      value={settings.default_risk_pct}
                      onChange={handleRiskChange}
                      className="w-full accent-[#3DDBD9]"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between">
                        <label className="text-xs text-[#838C9C] uppercase tracking-wider font-bold">Default Trade Amount ($)</label>
                        <span className="text-[#3DDBD9] text-sm font-bold">${settings.default_trade_amount}</span>
                    </div>
                    <input
                      type="number"
                      name="default_trade_amount"
                      min="10"
                      max="10000"
                      step="10"
                      value={settings.default_trade_amount}
                      onChange={handleRiskChange}
                      className="w-full bg-[#12161D] border-2 border-[#1F2833] rounded px-4 py-2 text-sm focus:outline-none focus:border-[#3DDBD9] transition-colors font-mono"
                    />
                  </div>
                </div>
            )}
            {activeTab === 'REBALANCE' && (
                <div className="space-y-6">
                    <button onClick={fetchRebalance} className="bg-[#3DDBD9] text-[#0B0C10] px-4 py-2 rounded text-sm font-bold uppercase tracking-wider hover:bg-white transition-colors">
                        {rebalanceLoading ? 'Calculating...' : 'Calculate Rebalance'}
                    </button>
                    {rebalanceSuggestions.length > 0 && (
                        <div className="space-y-4">
                           {rebalanceSuggestions.map(s => (
                               <div key={s.symbol} className="bg-[#12161D] p-4 rounded border border-[#1F2833] flex justify-between">
                                    <span className="font-bold">{s.symbol}</span>
                                    <span className="text-[#3DDBD9]">{s.action} ${s.diff.toFixed(2)}</span>
                               </div>
                           ))}
                        </div>
                    )}
                </div>
            )}
            {activeTab === 'AUTO' && (
                <div className="space-y-6">
                    {autoTrade.active && (
                        <div className="bg-green-500/10 border border-green-500/30 rounded p-3 text-center">
                            <span className="text-green-400 font-bold text-sm uppercase tracking-wider">Automated Trading Active</span>
                        </div>
                    )}
                    <div className="flex items-center justify-between p-4 bg-[#12161D] rounded border border-[#1F2833]">
                        <div>
                            <h3 className="text-[#E6E9EF] font-bold">Master Auto-Trade Switch</h3>
                            <p className="text-xs text-[#838C9C] mt-1">Enable autonomous trading engine in background</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" name="active" checked={autoTrade.active} onChange={handleAutoTradeChange} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3DDBD9]"></div>
                        </label>
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between">
                            <label className="text-xs text-[#838C9C] uppercase tracking-wider font-bold">AI Profitability Threshold</label>
                            <span className="text-[#3DDBD9] text-sm font-bold">{(autoTrade.min_profit_threshold * 100).toFixed(0)}%</span>
                        </div>
                        <input type="range" name="min_profit_threshold" min="0.5" max="0.95" step="0.01" value={autoTrade.min_profit_threshold} onChange={handleAutoTradeChange} className="w-full accent-[#3DDBD9]" />
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between">
                            <label className="text-xs text-[#838C9C] uppercase tracking-wider font-bold">Trade Capital Allocation ($)</label>
                            <span className="text-[#3DDBD9] text-sm font-bold">${autoTrade.trade_capital_alloc}</span>
                        </div>
                        <input type="range" name="trade_capital_alloc" min="10" max="5000" step="10" value={autoTrade.trade_capital_alloc} onChange={handleAutoTradeChange} className="w-full accent-[#3DDBD9]" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs text-[#838C9C] uppercase tracking-wider font-bold">Stop Loss (%)</label>
                            <input type="number" name="sl_threshold_pct" value={autoTrade.sl_threshold_pct} onChange={handleAutoTradeChange} className="w-full bg-[#12161D] border-2 border-[#1F2833] rounded px-4 py-2 text-sm focus:outline-none focus:border-[#3DDBD9] transition-colors font-mono" step="0.01" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs text-[#838C9C] uppercase tracking-wider font-bold">Take Profit (%)</label>
                            <input type="number" name="tp_threshold_pct" value={autoTrade.tp_threshold_pct} onChange={handleAutoTradeChange} className="w-full bg-[#12161D] border-2 border-[#1F2833] rounded px-4 py-2 text-sm focus:outline-none focus:border-[#3DDBD9] transition-colors font-mono" step="0.01" />
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-[#838C9C] uppercase tracking-wider font-bold">Max Daily Loss Limit ($)</label>
                        <input type="number" name="max_daily_loss" value={autoTrade.max_daily_loss} onChange={handleAutoTradeChange} className="w-full bg-[#12161D] border-2 border-[#1F2833] rounded px-4 py-2 text-sm focus:outline-none focus:border-[#3DDBD9] transition-colors font-mono" step="10" />
                    </div>
                </div>
            )}
        </div>

        <div className="mt-8 pt-6 border-t-2 border-[#1F2833] flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-[#3DDBD9] text-[#0B0C10] px-8 py-3 rounded text-sm font-bold uppercase tracking-wider hover:bg-white transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
