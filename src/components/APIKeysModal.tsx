import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Settings, X, CheckCircle, AlertCircle } from "lucide-react";

export default function APIKeysModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState({
    nvidia: false,
    bybit: false,
    polygon: false,
    finnhub: false,
    ctrader: false
  });
  
  const [keys, setKeys] = useState({
    nvidia: "",
    bybit_key: "",
    bybit_secret: "",
    polygon: "",
    finnhub: "",
    ctrader_client_id: "",
    ctrader_client_secret: "",
    ctrader_access_token: ""
  });

  const checkKeys = async () => {
    try {
      const res = await fetch("/api/config/keys", { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (!data.nvidia || !data.bybit || !data.polygon || !data.finnhub) {
          setIsOpen(true);
        }
      }
    } catch (err) {
      console.warn("Could not fetch API keys status:", err);
    }
  };

  useEffect(() => {
    checkKeys();
    
    const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type === 'CTRADER_OAUTH_SUCCESS' && event.data?.token) {
            setKeys(prev => ({...prev, ctrader_access_token: event.data.token}));
            toast.success("cTrader OAuth Successful! Please click 'Save Keys'");
            
            // Re-check keys
            checkKeys();
        }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleCTraderAuth = async () => {
      if (!status.ctrader) {
          toast.error("Please enter and save your cTrader Client ID and Secret first.");
          return;
      }
      
      window.open("/api/ctrader/auth", "_blank", "width=600,height=800");
  };

  const handleSave = async () => {
    try {
      const res = await fetch("/api/config/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(keys)
      });
      if (res.ok) {
        toast.success("API keys updated successfully");
        setIsOpen(false);
        checkKeys();
      } else {
        toast.error("Failed to update API keys");
      }
    } catch (err) {
      toast.error("Network error while saving keys");
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-50 p-2 bg-[#12161D] border border-[#232833] rounded-full hover:bg-[#181D26] transition-colors group shadow-lg"
        title="Configure API Keys"
      >
        <Settings size={20} className="text-[#838C9C] group-hover:text-[#3DDBD9] transition-colors" />
        {(!status.nvidia || !status.bybit || !status.polygon || !status.finnhub) && (
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#FF1744] rounded-full"></span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#12161D] border-2 border-[#232833] rounded-lg w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[#232833] flex justify-between items-center bg-[#0B0E13]">
              <h2 className="font-mono text-[#E6E9EF] font-bold text-lg flex items-center gap-2">
                <Settings size={20} className="text-[#3DDBD9]" />
                API Keys Configuration
              </h2>
              <button onClick={() => setIsOpen(false)} className="text-[#838C9C] hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-[#0B0E13] p-4 rounded border border-[#232833] text-sm text-[#838C9C]">
                Enter your API keys below to enable full functionality. These keys are only kept in memory while the server runs.
              </div>

              {/* NVIDIA */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-bold text-[#E6E9EF]">NVIDIA NIM API Key</label>
                  {status.nvidia ? <CheckCircle size={14} className="text-[#00E676]" /> : <AlertCircle size={14} className="text-[#FF1744]" />}
                </div>
                <input 
                  type="password"
                  placeholder={status.nvidia ? "••••••••••••••••" : "nvapi-..."}
                  value={keys.nvidia}
                  onChange={(e) => setKeys({...keys, nvidia: e.target.value})}
                  className="w-full bg-[#0B0E13] border border-[#232833] rounded px-3 py-2 text-[#E6E9EF] focus:outline-none focus:border-[#3DDBD9]"
                />
              </div>

              {/* Bybit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-bold text-[#E6E9EF]">Bybit API Key</label>
                    {status.bybit ? <CheckCircle size={14} className="text-[#00E676]" /> : <AlertCircle size={14} className="text-[#FF1744]" />}
                  </div>
                  <input 
                    type="password"
                    placeholder={status.bybit ? "••••••••••••••••" : "Your Bybit Key"}
                    value={keys.bybit_key}
                    onChange={(e) => setKeys({...keys, bybit_key: e.target.value})}
                    className="w-full bg-[#0B0E13] border border-[#232833] rounded px-3 py-2 text-[#E6E9EF] focus:outline-none focus:border-[#3DDBD9]"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-bold text-[#E6E9EF]">Bybit API Secret</label>
                  </div>
                  <input 
                    type="password"
                    placeholder={status.bybit ? "••••••••••••••••" : "Your Bybit Secret"}
                    value={keys.bybit_secret}
                    onChange={(e) => setKeys({...keys, bybit_secret: e.target.value})}
                    className="w-full bg-[#0B0E13] border border-[#232833] rounded px-3 py-2 text-[#E6E9EF] focus:outline-none focus:border-[#3DDBD9]"
                  />
                </div>
              </div>

              {/* Polygon */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-bold text-[#E6E9EF]">Polygon API Key</label>
                  {status.polygon ? <CheckCircle size={14} className="text-[#00E676]" /> : <AlertCircle size={14} className="text-[#FF1744]" />}
                </div>
                <input 
                  type="password"
                  placeholder={status.polygon ? "••••••••••••••••" : "Your Polygon Key"}
                  value={keys.polygon}
                  onChange={(e) => setKeys({...keys, polygon: e.target.value})}
                  className="w-full bg-[#0B0E13] border border-[#232833] rounded px-3 py-2 text-[#E6E9EF] focus:outline-none focus:border-[#3DDBD9]"
                />
              </div>

              {/* Finnhub */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-bold text-[#E6E9EF]">Finnhub API Key</label>
                  {status.finnhub ? <CheckCircle size={14} className="text-[#00E676]" /> : <AlertCircle size={14} className="text-[#FF1744]" />}
                </div>
                <input 
                  type="password"
                  placeholder={status.finnhub ? "••••••••••••••••" : "Your Finnhub Key"}
                  value={keys.finnhub}
                  onChange={(e) => setKeys({...keys, finnhub: e.target.value})}
                  className="w-full bg-[#0B0E13] border border-[#232833] rounded px-3 py-2 text-[#E6E9EF] focus:outline-none focus:border-[#3DDBD9]"
                />
              </div>

              {/* cTrader */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-bold text-[#E6E9EF]">cTrader Client ID</label>
                    {status.ctrader ? <CheckCircle size={14} className="text-[#00E676]" /> : <AlertCircle size={14} className="text-[#FF1744]" />}
                  </div>
                  <input 
                    type="password"
                    placeholder={status.ctrader ? "••••••••••••••••" : "Your cTrader Client ID"}
                    value={keys.ctrader_client_id}
                    onChange={(e) => setKeys({...keys, ctrader_client_id: e.target.value})}
                    className="w-full bg-[#0B0E13] border border-[#232833] rounded px-3 py-2 text-[#E6E9EF] focus:outline-none focus:border-[#3DDBD9]"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-bold text-[#E6E9EF]">cTrader Client Secret</label>
                  </div>
                  <input 
                    type="password"
                    placeholder={status.ctrader ? "••••••••••••••••" : "Your cTrader Secret"}
                    value={keys.ctrader_client_secret}
                    onChange={(e) => setKeys({...keys, ctrader_client_secret: e.target.value})}
                    className="w-full bg-[#0B0E13] border border-[#232833] rounded px-3 py-2 text-[#E6E9EF] focus:outline-none focus:border-[#3DDBD9]"
                  />
                </div>
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-bold text-[#E6E9EF]">cTrader Access Token</label>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="password"
                      placeholder={status.ctrader ? "••••••••••••••••" : "Your cTrader OAuth Token (Optional)"}
                      value={keys.ctrader_access_token}
                      onChange={(e) => setKeys({...keys, ctrader_access_token: e.target.value})}
                      className="flex-1 bg-[#0B0E13] border border-[#232833] rounded px-3 py-2 text-[#E6E9EF] focus:outline-none focus:border-[#3DDBD9]"
                    />
                    <button
                      onClick={handleCTraderAuth}
                      className="px-4 py-2 bg-[#1E2530] text-[#3DDBD9] border border-[#3DDBD9] font-bold rounded hover:bg-[#2A3441] transition-colors whitespace-nowrap"
                    >
                      Login via cTrader
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[#232833] bg-[#0B0E13] flex justify-end gap-3">
              <button 
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-[#838C9C] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="px-4 py-2 bg-[#3DDBD9] text-[#0B0E13] font-bold rounded hover:bg-opacity-90 transition-opacity"
              >
                Save Keys
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
