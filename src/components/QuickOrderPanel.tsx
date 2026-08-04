import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function QuickOrderPanel({ activeSymbol, accountMode }: { activeSymbol: string, accountMode: "DEMO" | "LIVE" }) {
    const [capital, setCapital] = useState(100);
    const [isOpen, setIsOpen] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [pendingTrade, setPendingTrade] = useState<any>(null);

    useEffect(() => {
        if (isOpen) {
            analyzeSymbol();
        }
    }, [isOpen, activeSymbol]);

    const playSuccessSound = () => {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.frequency.value = 440;
        gainNode.gain.value = 0.1;
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    };

    const analyzeSymbol = async () => {
        setIsLoading(true);
        const toastId = toast.loading('Scanning market for best ROI...');
        try {
            const res = await fetch("/api/ai/evaluate-pair", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ symbol: activeSymbol })
            });
            const data = await res.json();
            setAiAnalysis(data);
            toast.dismiss(toastId);
        } catch (error) {
            console.error("AI Analysis failed", error);
            toast.error("AI Analysis failed", { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    const prepareTrade = async (side: "BUY" | "SELL") => {
        const res = await fetch("/api/market/prices", { cache: 'no-store' });
        const prices = await res.json();
        const price = prices[activeSymbol] || 1;
        
        // Use AI suggested TP/SL or default to 2% / 1% if not provided
        const tp = aiAnalysis?.suggested_tp || (side === "BUY" ? price * 1.02 : price * 0.98);
        const sl = aiAnalysis?.suggested_sl || (side === "BUY" ? price * 0.99 : price * 1.01);
        
        setPendingTrade({ side, price, tp, sl, capital });
    };

    const executeTrade = async () => {
        const { side, price, tp, sl, capital } = pendingTrade;
        try {
            const executeRes = await fetch("/api/trades/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    symbol: activeSymbol,
                    side,
                    capital,
                    execution_price: price,
                    tp,
                    sl,
                    account_mode: accountMode
                })
            });

            const data = await executeRes.json();
            if (executeRes.ok) {
                toast.success(`${side} executed for ${activeSymbol} at $${price}`);
                playSuccessSound();
                setPendingTrade(null);
            } else {
                toast.error(`Trade failed: ${data.error || data.message}`);
            }
        } catch (error) {
            toast.error("Failed to execute trade");
            console.error(error);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[60] bg-[#3DDBD9] text-[#0B0C10] font-bold text-xs px-4 py-2 rounded-full shadow-lg hover:bg-[#3DDBD9]/90 transition-all"
            >
                Quick Order
            </button>
        );
    }

    return (
        <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[60] w-72 bg-[#12161D] border border-[#232833] rounded-lg shadow-2xl p-4 space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-white text-sm">Quick Order ({activeSymbol})</h3>
                <button onClick={() => setIsOpen(false)} className="text-[#838C9C] hover:text-white">✕</button>
            </div>
            
            {isLoading ? (
                <div className="text-xs text-[#838C9C] text-center">Analyzing AI potential...</div>
            ) : aiAnalysis && (
                <div className="bg-[#0B0E13] p-3 rounded text-xs space-y-1 border border-[#232833]">
                    <div className="flex justify-between text-[#838C9C]"><span>Direction:</span> <span className={`font-bold ${aiAnalysis.directional_bias === "BUY" ? "text-[#00E676]" : "text-[#FF1744]"}`}>{aiAnalysis.directional_bias}</span></div>
                    <div className="flex justify-between text-[#838C9C]"><span>Win Rate:</span> <span className="text-white font-bold">{aiAnalysis.win_rate_probability}%</span></div>
                    <p className="text-[#E6E9EF] pt-1 border-t border-[#232833]">{aiAnalysis.reasoning}</p>
                </div>
            )}

            {pendingTrade && (
                <div className="absolute inset-0 z-50 bg-[#12161D]/95 border border-[#232833] rounded-lg p-6 flex flex-col items-center justify-center space-y-4">
                    <p className="text-white font-bold text-sm">Confirm {pendingTrade.side} {activeSymbol}</p>
                    <p className="text-[#838C9C] text-xs">Price: ${pendingTrade.price.toFixed(2)} | TP: ${pendingTrade.tp.toFixed(2)} | SL: ${pendingTrade.sl.toFixed(2)}</p>
                    <div className="flex gap-2 w-full">
                        <button onClick={() => setPendingTrade(null)} className="flex-1 bg-[#232833] text-white font-bold text-sm py-2 rounded">Cancel</button>
                        <button onClick={executeTrade} className="flex-1 bg-[#3DDBD9] text-[#0B0C10] font-bold text-sm py-2 rounded">Confirm</button>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <label className="text-xs text-[#838C9C]">Capital (USDT)</label>
                <input
                    type="number"
                    value={capital}
                    onChange={(e) => setCapital(Number(e.target.value))}
                    className="w-full bg-[#0B0E13] border border-[#232833] text-white px-2 py-1 rounded text-sm outline-none"
                />
            </div>

            <div className="flex gap-2">
                <button 
                    onClick={() => prepareTrade("BUY")}
                    className="flex-1 bg-[#00E676] text-[#0B0C10] font-bold text-sm py-2 rounded hover:bg-[#00E676]/90"
                >
                    BUY
                </button>
                <button 
                    onClick={() => prepareTrade("SELL")}
                    className="flex-1 bg-[#FF1744] text-[#0B0C10] font-bold text-sm py-2 rounded hover:bg-[#FF1744]/90"
                >
                    SELL
                </button>
            </div>
        </div>
    );
}
