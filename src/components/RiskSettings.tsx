"use client";
import React, { useState, useEffect } from 'react';

export default function RiskSettings() {
  const [activeTab, setActiveTab] = useState<'API' | 'RISK' | 'BROKER'>('API');
  
  const [settings, setSettings] = useState({
    max_concurrent_trades: 3,
    max_daily_drawdown_pct: 0.05,
    max_spread_pct: 0.001,
    default_risk_pct: 0.01,
  });
  
  const [apiKeys, setApiKeys] = useState({
      nvidia_nim: '',
      finnhub: ''
  });
  
  const [brokerKeys, setBrokerKeys] = useState({
      ctrader_client_id: '',
      ctrader_secret: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/risk/settings')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setSettings(data);
        }
      })
      .catch(err => console.error("Failed to load settings:", err));
  }, []);

  const handleRiskChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }));
  };
  
  const handleApiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setApiKeys(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBrokerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBrokerKeys(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/risk/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setMessage('Settings saved successfully.');
      } else {
        setMessage('Failed to save settings.');
      }
    } catch (err) {
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
                onClick={() => setActiveTab('API')} 
                className={`px-4 py-2 uppercase font-bold text-sm transition-colors whitespace-nowrap ${activeTab === 'API' ? 'text-[#3DDBD9] border-b-2 border-[#3DDBD9]' : 'text-[#838C9C] hover:text-white'}`}
            >
                AI & Data APIs
            </button>
            <button 
                onClick={() => setActiveTab('BROKER')} 
                className={`px-4 py-2 uppercase font-bold text-sm transition-colors whitespace-nowrap ${activeTab === 'BROKER' ? 'text-[#3DDBD9] border-b-2 border-[#3DDBD9]' : 'text-[#838C9C] hover:text-white'}`}
            >
                cTrader Integration
            </button>
            <button 
                onClick={() => setActiveTab('RISK')} 
                className={`px-4 py-2 uppercase font-bold text-sm transition-colors whitespace-nowrap ${activeTab === 'RISK' ? 'text-[#3DDBD9] border-b-2 border-[#3DDBD9]' : 'text-[#838C9C] hover:text-white'}`}
            >
                Risk Parameters
            </button>
        </div>

        <div className="space-y-6">
            {activeTab === 'API' && (
                <div className="space-y-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-[#838C9C] uppercase tracking-wider font-bold">NVIDIA NIM API Key</label>
                      <input
                        type="password"
                        name="nvidia_nim"
                        value={apiKeys.nvidia_nim}
                        onChange={handleApiChange}
                        placeholder="nvapi-..."
                        className="bg-[#12161D] border-2 border-[#1F2833] rounded px-4 py-3 text-sm focus:outline-none focus:border-[#3DDBD9] transition-colors font-mono"
                      />
                      <span className="text-[10px] text-[#45A29E]">Required for Llama 3.1 70B Instruct forensic reasoning.</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-[#838C9C] uppercase tracking-wider font-bold">Finnhub API Key</label>
                      <input
                        type="password"
                        name="finnhub"
                        value={apiKeys.finnhub}
                        onChange={handleApiChange}
                        placeholder="cg..."
                        className="bg-[#12161D] border-2 border-[#1F2833] rounded px-4 py-3 text-sm focus:outline-none focus:border-[#3DDBD9] transition-colors font-mono"
                      />
                      <span className="text-[10px] text-[#45A29E]">Required for real-time macro sentiment and news headlines.</span>
                    </div>
                </div>
            )}
            
            {activeTab === 'BROKER' && (
                <div className="space-y-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-[#838C9C] uppercase tracking-wider font-bold">cTrader Open API Client ID</label>
                      <input
                        type="text"
                        name="ctrader_client_id"
                        value={brokerKeys.ctrader_client_id}
                        onChange={handleBrokerChange}
                        className="bg-[#12161D] border-2 border-[#1F2833] rounded px-4 py-3 text-sm focus:outline-none focus:border-[#3DDBD9] transition-colors font-mono"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-[#838C9C] uppercase tracking-wider font-bold">cTrader Open API Secret</label>
                      <input
                        type="password"
                        name="ctrader_secret"
                        value={brokerKeys.ctrader_secret}
                        onChange={handleBrokerChange}
                        className="bg-[#12161D] border-2 border-[#1F2833] rounded px-4 py-3 text-sm focus:outline-none focus:border-[#3DDBD9] transition-colors font-mono"
                      />
                    </div>
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
