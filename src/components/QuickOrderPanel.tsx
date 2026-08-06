import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Sparkles, TrendingUp, TrendingDown, RefreshCw, Search, CheckCircle2, ShieldAlert, Zap, X, FileText, Cpu, Compass } from 'lucide-react';
import { useRealtimeData } from "../hooks/useRealtimeData";
import { TRADABLE_PAIRS } from "../App";

export type TradingStrategy = "SWING_TRADING" | "SMC_ICT" | "MEAN_REVERSION" | "ORDER_FLOW" | "GRID_TRADING" | "TREND_FOLLOWING" | "CUSTOM_DOC";

export default function QuickOrderPanel({ activeSymbol: initialSymbol, accountMode }: { activeSymbol: string, accountMode: "DEMO" | "LIVE" }) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol || "BTCUSDT");
    const [selectedStrategies, setSelectedStrategies] = useState<TradingStrategy[]>(["SWING_TRADING", "SMC_ICT"]);
    const [customDocText, setCustomDocText] = useState("");
    const [showCustomDocModal, setShowCustomDocModal] = useState(false);
    const [activeCategory, setActiveCategory] = useState<"ALL" | "CRYPTO" | "FOREX" | "STOCKS">("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [capital, setCapital] = useState(100);
    const [aiAnalysis, setAiAnalysis] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [pendingTrade, setPendingTrade] = useState<any>(null);
    const { prices } = useRealtimeData();

    // Trigger AI Scan when panel opens or strategies change
    useEffect(() => {
        if (isOpen) {
            scanBestAITrade();
        }
    }, [isOpen, selectedStrategies]);

    // Update AI analysis if symbol is changed manually
    useEffect(() => {
        if (isOpen && selectedSymbol && (!aiAnalysis || aiAnalysis.symbol !== selectedSymbol)) {
            analyzeSymbol(selectedSymbol);
        }
    }, [selectedSymbol]);

    const playSuccessSound = () => {
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            osc.frequency.value = 520;
            gainNode.gain.value = 0.12;
            osc.start();
            osc.stop(audioCtx.currentTime + 0.15);
        } catch (e) {
            console.warn("Audio playback not supported:", e);
        }
    };

    const analyzeSymbol = async (symbolToAnalyze: string) => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/ai/evaluate-pair", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    symbol: symbolToAnalyze,
                    strategies: selectedStrategies,
                    strategy: selectedStrategies.join(","),
                    custom_doc: customDocText
                })
            });
            if (res.ok) {
                const data = await res.json();
                setAiAnalysis(data);
            }
        } catch (error) {
            console.error("AI Analysis failed", error);
        } finally {
            setIsLoading(false);
        }
    };

    const scanBestAITrade = async () => {
        setIsLoading(true);
        const label = selectedStrategies.length > 1 ? `${selectedStrategies.length} Combined Strategies` : selectedStrategies[0];
        const toastId = toast.loading(`NVIDIA AI scanning with [${label}]...`);
        try {
            const res = await fetch("/api/ai/evaluate-pair", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    symbol: "BEST_AUTO",
                    strategies: selectedStrategies,
                    strategy: selectedStrategies.join(","),
                    custom_doc: customDocText
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (data && data.symbol) {
                    setSelectedSymbol(data.symbol);
                    setAiAnalysis(data);
                    toast.success(`AI [${label}] selected ${data.symbol} (${data.win_rate_probability}% Win Rate)`, { id: toastId });
                } else {
                    toast.dismiss(toastId);
                }
            } else {
                toast.error("AI Scan returned an error", { id: toastId });
            }
        } catch (error) {
            console.error("AI Scan failed", error);
            toast.error("AI Scan failed", { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    const currentPrice = prices[selectedSymbol] || aiAnalysis?.suggested_entry || 0;
    const isForex = selectedSymbol.includes("USD") && !selectedSymbol.includes("USDT");

    const prepareTrade = (side: "BUY" | "SELL") => {
        const livePrice = prices[selectedSymbol] || currentPrice || 100;
        const tp = aiAnalysis?.suggested_tp || (side === "BUY" ? livePrice * 1.025 : livePrice * 0.975);
        const sl = aiAnalysis?.suggested_sl || (side === "BUY" ? livePrice * 0.988 : livePrice * 1.012);
        
        setPendingTrade({
            symbol: selectedSymbol,
            side,
            price: parseFloat(livePrice.toFixed(isForex ? 4 : 2)),
            tp: parseFloat(tp.toFixed(isForex ? 4 : 2)),
            sl: parseFloat(sl.toFixed(isForex ? 4 : 2)),
            capital,
            use_market_price: true
        });
    };

    const executeTrade = async () => {
        if (!pendingTrade) return;
        const { symbol, side, price, tp, sl, capital } = pendingTrade;
        try {
            const executeRes = await fetch("/api/trades/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    symbol,
                    side,
                    capital,
                    execution_price: price,
                    use_market_price: true,
                    tp,
                    sl,
                    account_mode: accountMode
                })
            });

            const data = await executeRes.json();
            if (executeRes.ok) {
                const executedPrice = data.position?.entry_price || price;
                toast.success(`${side} order executed for ${symbol} at $${executedPrice}`);
                playSuccessSound();
                window.dispatchEvent(new CustomEvent("trade_updated"));
                window.dispatchEvent(new Event("balance_updated"));
                setPendingTrade(null);
                setIsOpen(false);
            } else {
                toast.error(`Trade failed: ${data.error || data.message}`);
            }
        } catch (error) {
            toast.error("Failed to execute trade");
            console.error(error);
        }
    };

    // Filter symbol choices based on category and search query
    const filteredPairs = TRADABLE_PAIRS.filter(pair => {
        const matchesCategory = 
            activeCategory === "ALL" ? true :
            activeCategory === "CRYPTO" ? pair.category === "crypto" :
            activeCategory === "FOREX" ? pair.category === "forex" :
            pair.category === "stocks";
        const matchesSearch = pair.symbol.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[60] bg-[#3DDBD9] text-[#0B0C10] font-bold text-xs px-4 py-2.5 rounded-full shadow-2xl hover:bg-[#3DDBD9]/90 transition-all flex items-center gap-2 border border-[#3DDBD9]/50 hover:scale-105 active:scale-95"
            >
                <Sparkles size={16} className="animate-pulse text-[#0B0C10]" />
                <span>Quick AI Order</span>
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto">
            <div className="bg-[#12161D] border border-[#232833] rounded-2xl shadow-2xl w-full max-w-lg p-5 space-y-4 text-white relative animate-in fade-in zoom-in-95 duration-150">
                
                {/* Header */}
                <div className="flex justify-between items-center border-b border-[#232833] pb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-[#3DDBD9]/10 border border-[#3DDBD9]/30 text-[#3DDBD9]">
                            <Sparkles size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-base tracking-wide text-white">AI Quick Order Engine</h3>
                            <p className="text-[11px] text-[#838C9C]">Instant multi-market AI scan & 1-click trade execution</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsOpen(false)} 
                        className="text-[#838C9C] hover:text-white p-1.5 rounded-lg hover:bg-[#1E232D] transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* AI Strategy Selection & Multi-Confluence Bar */}
                <div className="space-y-2 bg-[#0B0E13] border border-[#232833] rounded-xl p-3">
                    <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5 text-white font-semibold">
                            <Compass size={14} className="text-[#3DDBD9]" />
                            <span>AI Active Strategies & Confluence</span>
                            {selectedStrategies.length > 1 && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#3DDBD9]/20 text-[#3DDBD9] border border-[#3DDBD9]/40 font-bold font-mono">
                                    ⚡ {selectedStrategies.length} Combined
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => setShowCustomDocModal(true)}
                            className="text-[#3DDBD9] hover:underline text-[11px] font-medium flex items-center gap-1"
                        >
                            <FileText size={12} />
                            {customDocText ? "Edit Custom Rules" : "+ Custom Rules / Doc"}
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono">
                        {[
                            { id: "SWING_TRADING", label: "Swing Trading", desc: "4H/1D Fib & Struct" },
                            { id: "SMC_ICT", label: "ICT / SMC", desc: "FVG & Order Blocks" },
                            { id: "MEAN_REVERSION", label: "Mean Reversion", desc: "Bollinger & VWAP" },
                            { id: "ORDER_FLOW", label: "Order Flow", desc: "Volume Delta Tape" },
                            { id: "GRID_TRADING", label: "Grid Trading", desc: "ATR Harvesting" },
                            { id: "TREND_FOLLOWING", label: "Trend Breakout", desc: "20/50/200 EMA" },
                            { id: "CUSTOM_DOC", label: "Custom Rules", desc: customDocText ? "Doc Loaded" : "Paste Doc" }
                        ].map((strat) => {
                            const isSelected = selectedStrategies.includes(strat.id as TradingStrategy);
                            return (
                                <button
                                    key={strat.id}
                                    onClick={() => {
                                        if (strat.id === "CUSTOM_DOC" && !customDocText) {
                                            setShowCustomDocModal(true);
                                            return;
                                        }
                                        const sId = strat.id as TradingStrategy;
                                        if (isSelected) {
                                            if (selectedStrategies.length === 1) {
                                                toast.error("Keep at least 1 strategy active");
                                                return;
                                            }
                                            setSelectedStrategies(selectedStrategies.filter(s => s !== sId));
                                        } else {
                                            setSelectedStrategies([...selectedStrategies, sId]);
                                        }
                                    }}
                                    className={`p-2 rounded-lg border text-left transition-all ${
                                        isSelected
                                            ? "bg-[#3DDBD9]/15 border-[#3DDBD9] text-white font-bold shadow-[0_0_8px_rgba(61,219,217,0.2)]"
                                            : "bg-[#12161D] border-[#1E232D] text-[#838C9C] hover:border-[#3DDBD9]/40 hover:text-white"
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-white text-[11px]">{strat.label}</span>
                                        <span className={`text-[10px] font-bold ${isSelected ? "text-[#3DDBD9]" : "text-gray-600"}`}>
                                            {isSelected ? "✓" : "+"}
                                        </span>
                                    </div>
                                    <span className="block text-[9px] text-[#838C9C] truncate mt-0.5">{strat.desc}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Custom Strategy / Knowledge Base Modal */}
                {showCustomDocModal && (
                    <div className="absolute inset-0 z-[120] bg-[#12161D] border border-[#3DDBD9]/40 rounded-2xl p-5 flex flex-col space-y-3 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-center border-b border-[#232833] pb-2">
                            <div className="flex items-center gap-2">
                                <FileText size={18} className="text-[#3DDBD9]" />
                                <h4 className="font-bold text-sm text-white">Paste Custom Strategy / Trading Rules</h4>
                            </div>
                            <button onClick={() => setShowCustomDocModal(false)} className="text-[#838C9C] hover:text-white">
                                <X size={16} />
                            </button>
                        </div>
                        <p className="text-[11px] text-[#838C9C] leading-relaxed">
                            Provide your custom strategy guidelines, trading journal parameters, SMC key levels, or YouTube strategy notes below. NVIDIA AI will apply these exact parameters when scanning markets.
                        </p>
                        <textarea
                            value={customDocText}
                            onChange={(e) => setCustomDocText(e.target.value)}
                            placeholder="Paste custom trading rules, strategy documentation, or YouTube notes here (e.g. 'Look for 15m Fair Value Gap after 10 AM EST liquidity sweep, require 1:3 RR risk profile')..."
                            className="w-full flex-1 min-h-[140px] bg-[#0B0E13] border border-[#232833] text-white p-3 rounded-xl text-xs font-mono outline-none focus:border-[#3DDBD9] resize-none"
                        />
                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={() => setShowCustomDocModal(false)}
                                className="flex-1 bg-[#1E232D] text-[#838C9C] hover:text-white text-xs font-bold py-2 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (customDocText.trim()) {
                                        setSelectedStrategies(["CUSTOM_DOC"]);
                                        toast.success("Custom trading strategy loaded successfully!");
                                    }
                                    setShowCustomDocModal(false);
                                }}
                                className="flex-1 bg-[#3DDBD9] text-[#0B0C10] text-xs font-bold py-2 rounded-lg hover:bg-[#3DDBD9]/90"
                            >
                                Save & Apply Strategy
                            </button>
                        </div>
                    </div>
                )}

                {/* AI Scan Top Action Button */}
                <div className="bg-[#0B0E13] border border-[#232833] rounded-xl p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Zap size={16} className="text-[#3DDBD9]" />
                        <span className="text-xs font-semibold text-white">Auto-Scan All Markets</span>
                    </div>
                    <button
                        onClick={scanBestAITrade}
                        disabled={isLoading}
                        className="bg-[#3DDBD9]/15 border border-[#3DDBD9]/40 text-[#3DDBD9] hover:bg-[#3DDBD9] hover:text-[#0B0C10] font-bold text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                        <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
                        <span>{isLoading ? "Scanning..." : "Run AI Scan"}</span>
                    </button>
                </div>

                {/* Category Tabs & Search Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-[#838C9C] font-medium">Select Market Pair ({filteredPairs.length})</span>
                        <div className="flex gap-1 text-[11px]">
                            {(["ALL", "CRYPTO", "FOREX", "STOCKS"] as const).map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                                        activeCategory === cat 
                                            ? "bg-[#3DDBD9] text-[#0B0C10]" 
                                            : "bg-[#1E232D] text-[#838C9C] hover:text-white"
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-2.5 text-[#838C9C]" />
                        <input
                            type="text"
                            placeholder="Filter pairs (e.g. BTC, EUR, NVDA)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#0B0E13] border border-[#232833] text-white pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none focus:border-[#3DDBD9] font-mono"
                        />
                    </div>

                    {/* Pair Badges (No clipped select box!) */}
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1 pt-1 scrollbar-thin">
                        {filteredPairs.map(pair => {
                            const isSelected = selectedSymbol === pair.symbol;
                            const isAiSelected = aiAnalysis?.symbol === pair.symbol;
                            return (
                                <button
                                    key={pair.symbol}
                                    onClick={() => setSelectedSymbol(pair.symbol)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1 ${
                                        isSelected 
                                            ? "bg-[#3DDBD9] text-[#0B0C10] font-bold shadow-md scale-105" 
                                            : "bg-[#0B0E13] border border-[#232833] text-[#C5C9D3] hover:border-[#3DDBD9]/50 hover:text-white"
                                    }`}
                                >
                                    <span>{pair.symbol}</span>
                                    {isAiSelected && <CheckCircle2 size={12} className={isSelected ? "text-[#0B0C10]" : "text-[#3DDBD9]"} />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* AI Signal Analysis Result Card */}
                {isLoading ? (
                    <div className="bg-[#0B0E13] p-4 rounded-xl text-xs text-[#838C9C] text-center border border-[#232833] animate-pulse flex items-center justify-center gap-2">
                        <Sparkles size={16} className="animate-spin text-[#3DDBD9]" />
                        <span>NVIDIA NIM AI evaluating technicals & order book metrics...</span>
                    </div>
                ) : aiAnalysis && (
                    <div className="bg-[#0B0E13] p-3.5 rounded-xl text-xs space-y-2 border border-[#232833] relative overflow-hidden">
                        <div className="flex justify-between items-center border-b border-[#1E232D] pb-2">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[#838C9C]">Target Pair:</span>
                                <span className="font-bold text-white font-mono text-sm">{aiAnalysis.symbol || selectedSymbol}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[#838C9C]">AI Win Probability:</span>
                                <span className="text-[#3DDBD9] font-bold font-mono text-sm">{aiAnalysis.win_rate_probability}%</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[#838C9C]">Directional Bias:</span>
                                <span className={`font-bold flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
                                    aiAnalysis.directional_bias?.includes("BUY") 
                                        ? "bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/30" 
                                        : "bg-[#FF1744]/10 text-[#FF1744] border border-[#FF1744]/30"
                                }`}>
                                    {aiAnalysis.directional_bias?.includes("BUY") ? <TrendingUp size={13}/> : <TrendingDown size={13}/>}
                                    {aiAnalysis.directional_bias}
                                </span>
                            </div>
                            <div className="text-[11px] font-mono text-[#838C9C]">
                                Live Mark: <span className="text-white font-bold">${currentPrice ? currentPrice.toFixed(isForex ? 4 : 2) : "..."}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                            <div className="bg-[#12161D] p-2 rounded border border-[#1E232D] text-[#00E676]">
                                <span className="text-[#838C9C] block text-[10px]">Suggested TP</span>
                                ${aiAnalysis.suggested_tp}
                            </div>
                            <div className="bg-[#12161D] p-2 rounded border border-[#1E232D] text-[#FF1744]">
                                <span className="text-[#838C9C] block text-[10px]">Suggested SL</span>
                                ${aiAnalysis.suggested_sl}
                            </div>
                        </div>

                        <p className="text-[#C5C9D3] text-[11px] pt-1 leading-relaxed border-t border-[#1E232D]">
                            {aiAnalysis.reasoning}
                        </p>
                    </div>
                )}

                {/* Confirm Trade Modal Overlay */}
                {pendingTrade && (
                    <div className="absolute inset-0 z-50 bg-[#12161D]/98 border border-[#3DDBD9]/40 rounded-2xl p-6 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-150">
                        <div className="flex items-center gap-2 text-white font-bold text-base">
                            <ShieldAlert size={20} className="text-[#3DDBD9]" />
                            <span>Confirm {pendingTrade.side} Order</span>
                        </div>
                        <div className="bg-[#0B0E13] border border-[#232833] p-4 rounded-xl w-full text-xs space-y-2 font-mono text-[#C5C9D3]">
                            <div className="flex justify-between"><span>Symbol:</span> <span className="text-white font-bold">{pendingTrade.symbol}</span></div>
                            <div className="flex justify-between"><span>Execution Price:</span> <span className="text-white">${pendingTrade.price}</span></div>
                            <div className="flex justify-between text-[#00E676]"><span>Take Profit (TP):</span> <span>${pendingTrade.tp}</span></div>
                            <div className="flex justify-between text-[#FF1744]"><span>Stop Loss (SL):</span> <span>${pendingTrade.sl}</span></div>
                            <div className="flex justify-between pt-2 border-t border-[#1E232D] text-white font-bold"><span>Margin Capital:</span> <span>${pendingTrade.capital} USDT</span></div>
                        </div>
                        <div className="flex gap-3 w-full pt-2">
                            <button onClick={() => setPendingTrade(null)} className="flex-1 bg-[#232833] text-white font-bold text-xs py-2.5 rounded-lg hover:bg-[#2B303D]">Cancel</button>
                            <button onClick={executeTrade} className="flex-1 bg-[#3DDBD9] text-[#0B0C10] font-bold text-xs py-2.5 rounded-lg hover:bg-[#3DDBD9]/90 shadow-lg">Confirm & Execute</button>
                        </div>
                    </div>
                )}

                {/* Margin Capital Input */}
                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-[#838C9C]">
                        <label className="font-medium">Trade Margin (USDT)</label>
                        <span>Mode: <strong className="text-[#3DDBD9] font-mono">{accountMode}</strong></span>
                    </div>
                    <input
                        type="number"
                        value={capital}
                        onChange={(e) => setCapital(Number(e.target.value))}
                        min={1}
                        className="w-full bg-[#0B0E13] border border-[#232833] text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-[#3DDBD9] font-mono"
                    />
                </div>

                {/* Execute Buy / Sell Buttons */}
                <div className="flex gap-3 pt-1">
                    <button 
                        onClick={() => prepareTrade("BUY")}
                        className="flex-1 bg-[#00E676] text-[#0B0C10] font-bold text-sm py-3 rounded-xl hover:bg-[#00E676]/90 transition-all flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <TrendingUp size={16} />
                        <span>BUY / LONG</span>
                    </button>
                    <button 
                        onClick={() => prepareTrade("SELL")}
                        className="flex-1 bg-[#FF1744] text-white font-bold text-sm py-3 rounded-xl hover:bg-[#FF1744]/90 transition-all flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <TrendingDown size={16} />
                        <span>SELL / SHORT</span>
                    </button>
                </div>

            </div>
        </div>
    );
}
