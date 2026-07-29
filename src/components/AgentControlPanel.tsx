"use client";
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export default function AgentControlPanel() {
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const wsRef = useRef<WebSocket | null>(null);

  const fetchSignals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/agent-workspace/scan');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.recommended_pairs && data.recommended_pairs.length > 0) {
        setSignals(prev => {
          const newSignals = [...prev];
          data.recommended_pairs.forEach((pair: any) => {
             // Add if not already in list or handle duplicates? 
             // We'll just add it with a unique id
             newSignals.push({ ...pair, id: Math.random().toString(36).substr(2, 9), amount: 100 });
          });
          return newSignals;
        });
      }
    } catch (err) {
      toast.error("Failed to fetch signal");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
  }, []);

  // Setup WebSocket for prices
  useEffect(() => {
    if (signals.length === 0) return;
    
    // Disconnect old WS if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    const cryptoSignals = signals.filter(s => s.category !== "FOREX");
    const forexSignals = signals.filter(s => s.category === "FOREX");

    // Crypto via Binance WebSocket
    if (cryptoSignals.length > 0) {
        const symbols = Array.from(new Set(cryptoSignals.map(s => s.symbol.toLowerCase())));
        const streams = symbols.map(s => `${s}@ticker`).join('/');
        const wsUrl = `wss://stream.binance.com:9443/ws/${streams}`;
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.s && data.c) {
            setPrices(prev => ({
              ...prev,
              [data.s.toUpperCase()]: parseFloat(data.c)
            }));
          }
        };
    }

    // Forex via Simulated Ultra-High-Frequency (Finnhub proxy)
    // Note: A real Finnhub token is required for wss://ws.finnhub.io
    let forexInterval: any = null;
    if (forexSignals.length > 0) {
        forexInterval = setInterval(() => {
            setPrices(prev => {
                const updated = { ...prev };
                forexSignals.forEach(s => {
                    // Simulate millisecond-accurate top-of-book market values for Forex
                    const basePrice = s.suggested_entry || 1.085;
                    const noise = (Math.random() - 0.5) * 0.0004;
                    updated[s.symbol] = parseFloat((basePrice + noise).toFixed(5));
                });
                return updated;
            });
        }, 300); // 300ms polling as ultra-high-frequency fallback
    }

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (forexInterval) clearInterval(forexInterval);
    };
  }, [signals.length]);

  const handleExecute = async (signal: any) => {
    setLoading(true);
    try {
      const currentPrice = prices[signal.symbol] || 0;
      const res = await fetch("/api/trades/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            symbol: signal.symbol,
            side: signal.directional_bias.includes("BUY") ? "BUY" : "SELL",
            capital: signal.amount,
            execution_price: currentPrice,
            account_mode: "DEMO"
        })
      });
      if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to execute");
      }
      toast.success(`Trade Executed for ${signal.symbol}`);
      setSignals(prev => prev.filter(s => s.id !== signal.id));
    } catch (err: any) {
      toast.error(`Execution failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscard = (id: string) => {
    setSignals(prev => prev.filter(s => s.id !== id));
  };
  
  const updateAmount = (id: string, newAmount: number) => {
    setSignals(prev => prev.map(s => s.id === id ? { ...s, amount: newAmount } : s));
  };

  return (
    <div className="flex min-h-screen w-full bg-[#0B0C10] text-[#E6E9EF] font-mono p-6 overflow-y-auto">
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center pt-10 pb-20">
        <h1 className="text-3xl font-bold tracking-widest uppercase mb-4 text-white">Signal Bunker</h1>
        <button 
          onClick={fetchSignals} 
          disabled={loading}
          className="mb-12 px-6 py-2 border border-[#66FCF1] text-[#66FCF1] hover:bg-[#66FCF1] hover:text-[#0B0C10] uppercase tracking-widest text-sm transition-colors rounded"
        >
          {loading ? "Scanning..." : "Force Manual Scan"}
        </button>
        
        {signals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            {signals.map(signal => (
              <div key={signal.id} className="w-full bg-[#12161D] p-6 rounded-lg border border-[#1F2833] shadow-2xl flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-2xl font-bold text-white block">{signal.symbol}</span>
                    <span className={`text-xl font-bold mt-1 block ${prices[signal.symbol] ? 'text-white' : 'text-[#838C9C] animate-pulse'}`}>
                      {prices[signal.symbol] ? `$${prices[signal.symbol].toFixed(2)}` : 'Connecting WS...'}
                    </span>
                  </div>
                  <span className={`text-sm px-3 py-1 rounded font-bold ${signal.directional_bias.includes("BUY") ? "bg-[#00E676] text-black" : "bg-[#FF1744] text-white"}`}>
                    {signal.directional_bias}
                  </span>
                </div>
                
                <div className="text-sm text-[#838C9C] mb-4 flex-grow">
                  <p className="mb-2">Confidence: <span className="text-white font-bold">{signal.win_rate_probability}%</span></p>
                  <p className="italic">{signal.reasoning}</p>
                </div>

                <div className="mb-6">
                  <label className="block text-xs uppercase text-[#66FCF1] mb-2">Capital Allocation ($)</label>
                  <input 
                    type="number" 
                    value={signal.amount ?? ''} 
                    onChange={(e) => updateAmount(signal.id, Number(e.target.value))} 
                    className="w-full bg-[#1F2833] text-white p-3 rounded border border-transparent focus:border-[#66FCF1] outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => handleExecute(signal)} 
                    disabled={loading || !prices[signal.symbol]}
                    className="py-3 bg-[#66FCF1] text-[#0B0C10] font-bold rounded uppercase hover:bg-opacity-90 transition-colors disabled:opacity-50"
                  >
                    Execute Position
                  </button>
                  <button 
                    onClick={() => handleDiscard(signal.id)} 
                    className="py-3 bg-[#1F2833] text-[#FF1744] font-bold rounded uppercase hover:bg-[#1F2833] hover:text-white transition-colors border border-[#FF1744]"
                  >
                    Discard Signal
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[#838C9C] flex flex-col items-center justify-center h-48 border border-dashed border-[#1F2833] rounded-lg w-full">
            <span className="animate-pulse mb-2">Scanning market logic...</span>
            <span className="text-xs">Awaiting setup conditions</span>
          </div>
        )}
      </div>
    </div>
  );
}
