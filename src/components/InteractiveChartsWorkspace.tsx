import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries } from "lightweight-charts";
import { TRADABLE_PAIRS } from "../App";

interface RecommendedPair {
  symbol: string;
  category: string;
  directional_bias: string;
  win_rate_probability: number;
  timeframe: string;
  reasoning: string;
  suggested_entry: number;
  suggested_sl: number;
  suggested_tp: number;
}

export default function InteractiveChartsWorkspace() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("BTCUSDT");
  const [timeframe, setTimeframe] = useState("15m");
  const [activeMode, setActiveMode] = useState<"DEMO" | "LIVE">("DEMO");
  const [recommendations, setRecommendations] = useState<RecommendedPair[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [demoBalance, setDemoBalance] = useState<number>(10000.00);

  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  // Run Agent Scan
  const triggerAgentScan = async () => {
    setIsScanning(true);
    toast("Initiating AI agent forensics scan...");
    try {
      const res = await fetch(`/api/agent-workspace/scan?mode=${activeMode}`);
      const data = await res.json();
      if (res.ok) {
        setRecommendations(data.recommended_pairs || []);
        toast.success("Agent forensics scan complete");
      } else {
        toast.error("Failed to run agent scan");
      }
    } catch (err: any) {
      toast.error(`Agent scan error: ${err.message}`);
      console.error("Failed to run agent scan:", err);
    } finally {
      setIsScanning(false);
    }
  };

  const fetchDemoBalance = async () => {
    try {
      const res = await fetch("/api/agent-workspace/demo/account");
      const data = await res.json();
      setDemoBalance(data.balance);
    } catch (err) {
      console.error("Failed to fetch demo balance:", err);
    }
  };

  useEffect(() => {
    fetchDemoBalance();
  }, []);

  // Switch Active Chart Symbol instantly
  const handleSelectPair = (symbol: string) => {
    setSelectedSymbol(symbol);
    toast(`Chart updated: ${symbol}`);
  };

  const handleSetActiveMode = (mode: "DEMO" | "LIVE") => {
    setActiveMode(mode);
    toast(`Mode switched to ${mode}`);
  };

  const handleSetTimeframe = (tf: string) => {
    setTimeframe(tf);
    toast(`Timeframe set to ${tf}`);
  };

  // Execute 1-Click Demo Order
  const executeDemoTrade = async (pair: RecommendedPair) => {
    try {
      const res = await fetch("/api/agent-workspace/demo/place-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: pair.symbol,
          side: pair.directional_bias.includes("BUY") ? "BUY" : "SELL",
          qty: 1.0,
          price: pair.suggested_entry,
          stop_loss: pair.suggested_sl,
          take_profit: pair.suggested_tp,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`[DEMO MODE] ${data.message || 'Trade executed successfully'}`);
      } else {
        toast.error(`[DEMO MODE] Error: ${data.error || 'Failed to place order'}`);
      }
    } catch (err: any) {
      toast.error(`Demo trade failed: ${err.message}`);
      console.error("Demo trade failed:", err);
    }
  };

  // Execute 1-Click Live Order
  const executeLiveTrade = async (pair: RecommendedPair) => {
    try {
      const res = await fetch("/api/agent-workspace/live/place-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: pair.symbol,
          side: pair.directional_bias.includes("BUY") ? "BUY" : "SELL",
          qty: 1.0,
          price: pair.suggested_entry,
          stop_loss: pair.suggested_sl,
          take_profit: pair.suggested_tp,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`[LIVE MODE] ${data.message || 'Trade executed successfully'}`);
      } else {
        toast.error(`[LIVE MODE] Error: ${data.error || 'Failed to place order'}`);
      }
    } catch (err: any) {
      toast.error(`Live trade failed: ${err.message}`);
      console.error("Live trade failed:", err);
    }
  };

  useEffect(() => {
    triggerAgentScan();
  }, [activeMode]);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    let isMounted = true;

    // Initialize Chart matching Obsidian theme constraints
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#12161D" }, // --bg-panel
        textColor: "#838C9C", // --text-secondary
        fontFamily: '"JetBrains Mono", monospace',
      },
      grid: {
        vertLines: { color: "#232833" }, // --border-hairline
        horzLines: { color: "#232833" },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "#232833",
      },
      rightPriceScale: {
        borderColor: "#232833",
      },
    });

    const candlestickSeriesInstance = chart.addSeries(CandlestickSeries, {
      upColor: "#00E676", // Obsidian requested positive green for charts
      downColor: "#FF1744", // Obsidian requested negative red for charts
      borderVisible: false,
      wickUpColor: "#00E676",
      wickDownColor: "#FF1744",
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeriesInstance;

    const handleResize = () => {
      chart.applyOptions({
        width: chartContainerRef.current?.clientWidth ?? 800,
        height: chartContainerRef.current?.clientHeight ?? 600,
      });
    };
    window.addEventListener("resize", handleResize);

    // Fetch Historical Data backfill
    const fetchData = async () => {
      try {
        let formattedData = [];
        let intervalParams = timeframe;
        if (timeframe === "1m") intervalParams = "1";
        if (timeframe === "5m") intervalParams = "5";
        if (timeframe === "15m") intervalParams = "15";
        if (timeframe === "1h") intervalParams = "60";
        
        const isForex = TRADABLE_PAIRS.find((p: any) => p.symbol === selectedSymbol)?.category === 'forex';
        const categoryParam = isForex ? 'linear' : 'spot';

        const bybitRes = await fetch(`/api/bybit/v5/market/kline?category=${categoryParam}&symbol=${selectedSymbol}&interval=${intervalParams}&limit=500`);
        const bybitData = await bybitRes.json();
        if (bybitData.retCode === 0 && bybitData.result?.list) {
          formattedData = bybitData.result.list.map((item: any) => ({
            time: Math.floor(parseInt(item[0]) / 1000),
            open: parseFloat(item[1]),
            high: parseFloat(item[2]),
            low: parseFloat(item[3]),
            close: parseFloat(item[4]),
          }));
        }
        
        // Ensure data is sorted by time ascending (lightweight-charts requirement)
        formattedData.sort((a: any, b: any) => a.time - b.time);
        if (isMounted && formattedData.length > 0) {
          candlestickSeriesInstance.setData(formattedData);
        }
      } catch (err) {
        if (err instanceof TypeError) { console.warn("Historical data API offline"); } else { console.error("Failed to fetch historical data:", err); }
      }
    };
    fetchData();

    // Connect WebSocket for Live stream
    let ws: WebSocket;
    
    const connectWebSocket = () => {
      // Connect directly to Bybit WebSocket
      const isForex = TRADABLE_PAIRS.find((p: any) => p.symbol === selectedSymbol)?.category === 'forex';
      const wsUrl = isForex ? "wss://stream.bybit.com/v5/public/linear" : "wss://stream.bybit.com/v5/public/spot";
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        let wsInterval = timeframe;
        if (timeframe === "1m") wsInterval = "1";
        if (timeframe === "5m") wsInterval = "5";
        if (timeframe === "15m") wsInterval = "15";
        if (timeframe === "1h") wsInterval = "60";

        ws.send(JSON.stringify({
          op: "subscribe",
          args: [`kline.${wsInterval}.${selectedSymbol}`]
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          let wsInterval = timeframe;
          if (timeframe === "1m") wsInterval = "1";
          if (timeframe === "5m") wsInterval = "5";
          if (timeframe === "15m") wsInterval = "15";
          if (timeframe === "1h") wsInterval = "60";

          if (isMounted && msg.topic === `kline.${wsInterval}.${selectedSymbol}` && msg.data) {
            for (const item of msg.data) {
              candlestickSeriesInstance.update({
                time: Math.floor(item.start / 1000) as any,
                open: parseFloat(item.open),
                high: parseFloat(item.high),
                low: parseFloat(item.low),
                close: parseFloat(item.close),
              });
            }
          }
        } catch (err: any) {
          if (err && err.message && err.message.includes("Cannot update oldest data")) {
              // Ignore lightweight-charts error for older data
          } else {
              console.error("Bybit WS message error", err);
          }
        }
      };
    };
    
    connectWebSocket();

    return () => {
      isMounted = false;
      window.removeEventListener("resize", handleResize);
      if (ws) ws.close();
      chart.remove();
    };
  }, [selectedSymbol, timeframe]);

  return (
    <div className="min-h-full h-full bg-[#0B0E13] text-[#E0E0E0] font-sans flex flex-col p-2 md:p-6 pb-20">
      {/* Top Header Bar */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-[#1F2833] pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#E6E9EF] flex items-center gap-2">
            <span>OBSIDIAN CHART WORKSTATION</span>
            <span className="text-xs px-2 py-0.5 rounded border border-[#FFD600] text-[#FFD600] font-mono">
              {activeMode} MODE
            </span>
          </h1>
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
            Active Symbol: 
            <select
                className="bg-[#12161D] border border-[#1F2833] text-white px-2 py-0.5 rounded font-mono font-bold outline-none"
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
            >
              <optgroup label="Crypto">
                {TRADABLE_PAIRS.filter((p: any) => p.category === 'crypto').map((p: any) => (
                  <option key={p.symbol} value={p.symbol}>{p.symbol}</option>
                ))}
              </optgroup>
              <optgroup label="Forex">
                {TRADABLE_PAIRS.filter((p: any) => p.category === 'forex').map((p: any) => (
                  <option key={p.symbol} value={p.symbol}>{p.symbol}</option>
                ))}
              </optgroup>
            </select>
          </p>
        </div>

        {/* Controls Bar */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* Mode Switcher */}
          <div className="flex bg-[#12161D] border border-[#1F2833] rounded p-1">
            <button
              onClick={() => handleSetActiveMode("DEMO")}
              className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                activeMode === "DEMO" ? "bg-[#00E676] text-[#0B0C10] font-bold" : "text-gray-400"
              }`}
            >
              DEMO ($10,000)
            </button>
            <button
              onClick={() => handleSetActiveMode("LIVE")}
              className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                activeMode === "LIVE" ? "bg-[#FF1744] text-white font-bold" : "text-gray-400"
              }`}
            >
              LIVE API
            </button>
          </div>

          {/* Trigger Scan Button */}
          <button
            onClick={triggerAgentScan}
            disabled={isScanning}
            className="px-4 py-2 bg-[#FFD600] text-[#0B0C10] text-xs font-bold font-mono rounded hover:bg-yellow-400 transition-all flex items-center gap-2 shadow-[0_0_10px_rgba(255,214,0,0.3)]"
          >
            {isScanning ? "SCANNING..." : "⚡ RUN AGENT FORENSICS"}
          </button>
        </div>
      </header>

      {/* Main Grid: Responsive Chart + Agent Drawer */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Chart Viewport (8 Cols Desktop / Full Mobile & Tablet) */}
        <div className="md:col-span-8 bg-[#12161D] border-2 border-[#1F2833] rounded-lg p-4 flex flex-col min-h-[400px]">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-4">
              <span className="font-mono text-lg font-bold text-white">{selectedSymbol}</span>
              <div className="flex bg-[#0B0E13] border border-[#232833] rounded overflow-hidden">
                {['1m', '5m', '15m', '1h'].map(tf => (
                  <button
                    key={tf}
                    className={`px-3 py-0.5 text-xs font-bold transition-colors font-mono ${timeframe === tf ? 'bg-[#3DDBD9] text-[#0B0C10]' : 'text-[#838C9C] hover:bg-[#1F2833]'}`}
                    onClick={() => handleSetTimeframe(tf)}
                  >
                    {tf}
                  </button>
                ))}
              </div>
              <span className="text-xs text-[#00E676] font-mono flex items-center gap-1.5 hidden sm:flex">
                <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse"></span>
                LIVE TICK STREAM
              </span>
            </div>
            <div className="text-xs font-mono text-gray-400 hidden sm:block">
              Demo Balance: <span className="text-white">${demoBalance.toLocaleString()} USDT</span>
            </div>
          </div>
          <div className="flex-1 w-full relative" ref={chartContainerRef}>
          </div>
        </div>

        {/* Agent Recommendations Panel (4 Cols Desktop / Full Mobile & Tablet) */}
        <div className="md:col-span-4 bg-[#12161D] border-2 border-[#1F2833] rounded-lg p-4 flex flex-col h-full min-h-[400px]">
          <h2 className="text-sm font-bold font-mono text-[#FFD600] mb-3 flex items-center justify-between pb-2 border-b border-[#1F2833]">
            <span>HIGH-PROBABILITY RADAR</span>
            <span className="text-[10px] text-gray-400 font-normal">Ranked by Win %</span>
          </h2>

          <div className="space-y-3 overflow-y-auto flex-1 pr-1">
            {recommendations.length === 0 ? (
              <div className="text-xs font-mono text-gray-500 text-center py-8">
                No active scan results. Click "RUN AGENT FORENSICS" to analyze pairs.
              </div>
            ) : (
              recommendations.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedSymbol === item.symbol
                      ? "border-[#3DDBD9] bg-[#0B0E13] shadow-[0_0_15px_rgba(61,219,217,0.15)]"
                      : "border-[#1F2833] bg-[#0B0E13] hover:border-[#3DDBD9]/50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-base">{item.symbol}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1F2833] text-[#838C9C] font-bold">
                        {item.category}
                      </span>
                    </div>
                    {/* Win Rate Badge */}
                    <div className="text-right">
                      <span className="font-mono text-sm font-bold text-[#FFD600]">
                        {item.win_rate_probability}% WIN
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-[#838C9C] mb-3 leading-relaxed">{item.reasoning}</p>

                  <div className="grid grid-cols-3 text-[11px] font-mono text-gray-400 bg-[#12161D] p-2 rounded-md mb-3 border border-[#1F2833]">
                    <div>Entry: <span className="text-white block mt-0.5 font-bold">${item.suggested_entry}</span></div>
                    <div>SL: <span className="text-[#FF1744] block mt-0.5 font-bold">${item.suggested_sl}</span></div>
                    <div>TP: <span className="text-[#00E676] block mt-0.5 font-bold">${item.suggested_tp}</span></div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSelectPair(item.symbol)}
                      className="flex-1 py-1.5 bg-[#1F2833] hover:bg-[#3DDBD9] hover:text-[#0B0C10] text-white text-xs font-bold font-mono rounded transition-colors"
                    >
                      View Chart
                    </button>
                    {activeMode === "DEMO" ? (
                      <button
                        onClick={() => executeDemoTrade(item)}
                        className={`flex-1 py-1.5 text-[#0B0C10] font-bold text-xs font-mono rounded transition-colors shadow-sm ${item.directional_bias.includes("BUY") ? "bg-[#00E676] hover:bg-[#66FCF1]" : "bg-[#FF1744] text-white hover:bg-[#ff4d6d]"}`}
                      >
                        Demo {item.directional_bias.includes("BUY") ? "Buy" : "Sell"}
                      </button>
                    ) : (
                      <button
                        onClick={() => executeLiveTrade(item)}
                        className={`flex-1 py-1.5 text-[#0B0C10] font-bold text-xs font-mono rounded transition-colors shadow-sm ${item.directional_bias.includes("BUY") ? "bg-[#00E676] hover:bg-[#66FCF1]" : "bg-[#FF1744] text-white hover:bg-[#ff4d6d]"}`}
                      >
                        Live {item.directional_bias.includes("BUY") ? "Buy" : "Sell"}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
