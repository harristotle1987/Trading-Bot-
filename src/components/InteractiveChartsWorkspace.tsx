import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries, IPriceLine } from "lightweight-charts";
import { TRADABLE_PAIRS } from "../App";
import { formatPrice } from "../utils";

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

export default function InteractiveChartsWorkspace({ initialSymbol }: { initialSymbol?: string | null }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string>(initialSymbol || "BTCUSDT");
  const [timeframe, setTimeframe] = useState("15m");
  const [activeMode, setActiveMode] = useState<"DEMO" | "LIVE">("DEMO");
  const [recommendations, setRecommendations] = useState<RecommendedPair[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [demoBalance, setDemoBalance] = useState<number>(10000.00);
  const [activeTrades, setActiveTrades] = useState<any[]>([]);
  const [closedTrades, setClosedTrades] = useState<any[]>([]);

  // Trade Modal State
  const [tradeModal, setTradeModal] = useState<{isOpen: boolean; pair: RecommendedPair | null; amount: number; mode: "DEMO" | "LIVE"}>({
    isOpen: false,
    pair: null,
    amount: 100, // Default trade amount
    mode: "DEMO"
  });

  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const markersPluginRef = useRef<any>(null);

  // Run Agent Scan
  const triggerAgentScan = async () => {
    setIsScanning(true);
    toast("Initiating AI agent forensics scan...");
    try {
      const res = await fetch(`/api/agent-workspace/scan?mode=${activeMode}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDemoBalance(data.balance);
    } catch (err) {
      console.warn("Failed to fetch demo balance:", err);
    }
  };

  const fetchActiveTrades = async () => {
      try {
          const res = await fetch("/api/trades/active");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
          if (res.ok) {
              setActiveTrades(data || []);
          }
      } catch (err) {
          // Silent catch for network errors during dev server restarts
      }
  };

  const fetchClosedTrades = async () => {
      try {
          const res = await fetch("/api/trades/closed");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
          if (res.ok) {
              setClosedTrades(data || []);
          }
      } catch (err) {
          // Silent catch for network errors during dev server restarts
      }
  };

  useEffect(() => {
    fetchDemoBalance();
    fetchActiveTrades();
    fetchClosedTrades();
    const interval = setInterval(() => {
        fetchActiveTrades();
        fetchClosedTrades();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Update Price Lines when active trades or selected symbol changes
  useEffect(() => {
      if (!seriesRef.current) return;
      
      // Remove old price lines
      priceLinesRef.current.forEach(line => {
          try { seriesRef.current?.removePriceLine(line); } catch (e) {}
      });
      priceLinesRef.current = [];

      // Add new price lines for the selected symbol
      const relevantTrades = activeTrades.filter(t => t.symbol === selectedSymbol && t.account_mode === activeMode);
      relevantTrades.forEach(trade => {
          const isBuy = trade.side === "BUY";
          
          try {
              // Entry Line
              const entryLine = seriesRef.current?.createPriceLine({
              price: trade.entry_price,
              color: isBuy ? "#00E676" : "#FF1744",
              lineWidth: 2,
              lineStyle: 1, // Dotted
              axisLabelVisible: true,
              title: `${trade.side} Entry`
          });
          if (entryLine) priceLinesRef.current.push(entryLine);

          // Stop Loss Line
          if (trade.stop_loss) {
            const slLine = seriesRef.current?.createPriceLine({
                price: trade.stop_loss,
                color: "#FF1744", // Red for SL
                lineWidth: 1,
                lineStyle: 3, // Dashed
                axisLabelVisible: true,
                title: "SL"
            });
            if (slLine) priceLinesRef.current.push(slLine);
          }

          // Take Profit Line
          if (trade.take_profit) {
            const tpLine = seriesRef.current?.createPriceLine({
                price: trade.take_profit,
                color: "#00E676", // Green for TP
                lineWidth: 1,
                lineStyle: 3, // Dashed
                axisLabelVisible: true,
                title: "TP"
            });
            if (tpLine) priceLinesRef.current.push(tpLine);
          }
        } catch(e) {}
      });

      // Update Markers for Buy/Sell
      const markers: any[] = [];
      const relevantClosedTrades = closedTrades.filter(t => t.symbol === selectedSymbol && t.account_mode === activeMode);
      
      const addMarker = (trade: any, type: "Entry" | "Exit") => {
          const time = Math.floor(new Date(type === "Entry" ? trade.opened_at : trade.closed_at).getTime() / 1000);
          const isBuy = trade.side === "BUY";
          
          if (type === "Entry") {
            markers.push({
                time: time as any,
                position: isBuy ? 'belowBar' : 'aboveBar',
                color: isBuy ? '#00E676' : '#FF1744',
                shape: isBuy ? 'arrowUp' : 'arrowDown',
                text: `${isBuy ? 'BUY' : 'SELL'} @ ${trade.entry_price}`
            });
          } else if (type === "Exit") {
            const pnlColor = trade.realized_pnl >= 0 ? '#00E676' : '#FF1744';
            markers.push({
                time: time as any,
                position: isBuy ? 'aboveBar' : 'belowBar', // exit position is opposite
                color: pnlColor,
                shape: 'circle',
                text: `CLOSE PnL: $${trade.realized_pnl}`
            });
          }
      };

      relevantTrades.forEach(t => addMarker(t, "Entry"));
      relevantClosedTrades.forEach(t => {
          addMarker(t, "Entry");
          if (t.closed_at) addMarker(t, "Exit");
      });

      markers.sort((a, b) => a.time - b.time);
      if (seriesRef.current) {
          try {
              seriesRef.current.setMarkers(markers);
          } catch(e) {
          }
      }

  }, [activeTrades, closedTrades, selectedSymbol, activeMode]);

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
  const executeDemoTrade = async (pair: RecommendedPair, amount: number) => {
    try {
      const qty = parseFloat((amount / pair.suggested_entry).toFixed(4));
      const res = await fetch("/api/agent-workspace/demo/place-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: pair.symbol,
          side: pair.directional_bias.includes("BUY") ? "BUY" : "SELL",
          qty: qty,
          amount: amount,
          price: pair.suggested_entry,
          stop_loss: pair.suggested_sl,
          take_profit: pair.suggested_tp,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`[DEMO MODE] ${data.message || 'Trade executed successfully'}`);
        fetchDemoBalance();
      } else {
        toast.error(`[DEMO MODE] Error: ${data.error || 'Failed to place order'}`);
      }
    } catch (err: any) {
      toast.error(`Demo trade failed: ${err.message}`);
      console.error("Demo trade failed:", err);
    }
  };

  // Execute 1-Click Live Order
  const executeLiveTrade = async (pair: RecommendedPair, amount: number) => {
    try {
      const qty = parseFloat((amount / pair.suggested_entry).toFixed(4));
      const res = await fetch("/api/agent-workspace/live/place-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: pair.symbol,
          side: pair.directional_bias.includes("BUY") ? "BUY" : "SELL",
          qty: qty,
          amount: amount,
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
        if (timeframe === "1s") intervalParams = "1s";
        if (timeframe === "1m") intervalParams = "1";
        if (timeframe === "5m") intervalParams = "5";
        if (timeframe === "15m") intervalParams = "15";
        if (timeframe === "1h") intervalParams = "60";
        if (timeframe === "4h") intervalParams = "240";
        if (timeframe === "6h") intervalParams = "360";
        if (timeframe === "12h") intervalParams = "720";
        if (timeframe === "1d") intervalParams = "D";
        if (timeframe === "1year") intervalParams = "M";
        
const isForex = TRADABLE_PAIRS.find((p: any) => p.symbol === selectedSymbol)?.category === 'forex';
        const category = TRADABLE_PAIRS.find((p: any) => p.symbol === selectedSymbol)?.category || "crypto";
        const categoryParam = category;
        
        const cacheKey = `market_data_${selectedSymbol}_${intervalParams}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            try {
                const { timestamp, data } = JSON.parse(cached);
                // Use cache if it's less than 60 seconds old
                if (Date.now() - timestamp < 60000) {
                    if (isMounted && data.length > 0) {
                        candlestickSeriesInstance.setData(data);
                    }
                    return;
                }
            } catch (e) {
                // Ignore parse error
            }
        }

        const bybitRes = await fetch(`/api/market/kline?category=${categoryParam}&symbol=${selectedSymbol}&interval=${intervalParams}&limit=500`);
        if (!bybitRes.ok) throw new Error(`HTTP ${bybitRes.status}`);
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
        
        sessionStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: formattedData }));
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
      const isForex = TRADABLE_PAIRS.find((p: any) => p.symbol === selectedSymbol)?.category === 'forex';
      
      const category = TRADABLE_PAIRS.find((p: any) => p.symbol === selectedSymbol)?.category || "crypto";
      if (category === "crypto" && timeframe === "1s") {
          // Use Binance WebSocket for 1s data
          const wsUrl = `wss://stream.binance.com:9443/ws/${selectedSymbol.toLowerCase()}@kline_1s`;
          ws = new WebSocket(wsUrl);
          
          ws.onmessage = (event) => {
              try {
                  const msg = JSON.parse(event.data);
                  if (isMounted && msg.e === "kline" && msg.k) {
                      candlestickSeriesInstance.update({
                          time: Math.floor(msg.k.t / 1000) as any,
                          open: parseFloat(msg.k.o),
                          high: parseFloat(msg.k.h),
                          low: parseFloat(msg.k.l),
                          close: parseFloat(msg.k.c),
                      });
                  }
              } catch (err: any) {
                  if (err && err.message && err.message.includes("Cannot update oldest data")) {
                      // Ignore lightweight-charts error for older data
                  } else {
                      console.error("Binance WS message error", err);
                  }
              }
          };
      } else if (category === "forex" || category === "stocks") {
          // Bybit doesn't support forex, so we poll our own server for updates
          let currentPrice = 1.0;
          let lastCandleTime = Math.floor(Date.now() / 1000);
          
          let intervalMs = 60000;
          if (timeframe === "1s") intervalMs = 1000;
          if (timeframe === "1m") intervalMs = 60000;
          if (timeframe === "5m") intervalMs = 300000;
          if (timeframe === "15m") intervalMs = 900000;
          if (timeframe === "1h") intervalMs = 3600000;
          if (timeframe === "4h") intervalMs = 14400000;
          
          let currentOpen = 0;
          let currentHigh = 0;
          let currentLow = Number.MAX_VALUE;
          
          const updateInterval = setInterval(async () => {
              if (!isMounted) return clearInterval(updateInterval);
              try {
                  const res = await fetch('/api/market/prices');
                  if (!res.ok) return;
                  const data = await res.json();
                  if (data[selectedSymbol]) {
                      const newPrice = data[selectedSymbol];
                      
                      const nowMs = Date.now();
                      const candleTime = Math.floor(nowMs / intervalMs) * intervalMs;
                      const timeInSeconds = Math.floor(candleTime / 1000);
                      
                      if (timeInSeconds !== lastCandleTime) {
                          // New candle
                          lastCandleTime = timeInSeconds;
                          currentOpen = newPrice;
                          currentHigh = newPrice;
                          currentLow = newPrice;
                      } else {
                          // Update current candle
                          if (currentOpen === 0) currentOpen = newPrice;
                          currentHigh = Math.max(currentHigh, newPrice);
                          currentLow = Math.min(currentLow, newPrice);
                      }
                      
                      candlestickSeriesInstance.update({
                          time: timeInSeconds as any,
                          open: currentOpen,
                          high: currentHigh,
                          low: currentLow,
                          close: newPrice
                      });
                  }
              } catch (e) {
                  // ignore
              }
          }, 3000); // poll every 3s
          
          // @ts-ignore
          ws = { close: () => clearInterval(updateInterval) } as any;
          
      } else {
          // Connect directly to Binance WebSocket
let wsInterval = timeframe;
          if (timeframe === "1m") wsInterval = "1m";
          else if (timeframe === "5m") wsInterval = "5m";
          else if (timeframe === "15m") wsInterval = "15m";
          else if (timeframe === "1h") wsInterval = "1h";
          else if (timeframe === "4h") wsInterval = "4h";
          else if (timeframe === "6h") wsInterval = "6h";
          else if (timeframe === "12h") wsInterval = "12h";
          else if (timeframe === "1d") wsInterval = "1d";
          else wsInterval = "1m";

          const wsUrl = `wss://stream.binance.com:9443/ws/${selectedSymbol.toLowerCase()}@kline_${wsInterval}`;
          ws = new WebSocket(wsUrl);
          
          ws.onmessage = (event) => {
            try {
              const msg = JSON.parse(event.data);
              if (!msg.k) return;
              const kline = msg.k;
              
              if (isMounted) {
                candlestickSeriesInstance.update({
                  time: Math.floor(kline.t / 1000) as any,
                  open: parseFloat(kline.o),
                  high: parseFloat(kline.h),
                  low: parseFloat(kline.l),
                  close: parseFloat(kline.c)
                });
              }
            } catch (err: any) {
                if (err && err.message && err.message.includes("Cannot update oldest data")) {
                    // Ignore lightweight-charts error for older data
                } else {
                    console.error("Binance WS message error", err);
                }
            }
          };
      }
      return () => {
          if (ws) ws.close();
      };
    };
    connectWebSocket();

    return () => {
      isMounted = false;
      if (ws) ws.close();
      if (chart) {
        try {
            chart.remove();
        } catch (e) {
            console.warn("Chart removal error:", e);
        }
      }
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [selectedSymbol, timeframe]);

  return (
    <div className="min-h-full h-full bg-[#0B0E13] text-[#E0E0E0] font-sans flex flex-col p-2 md:p-6 pb-20">
      {/* Trade Amount Modal */}
      {tradeModal.isOpen && tradeModal.pair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#12161D] border border-[#1F2833] rounded-lg p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 font-mono uppercase border-b border-[#1F2833] pb-2">
              Confirm {tradeModal.mode} Trade
            </h3>
            <div className="mb-4 text-sm text-[#838C9C] font-mono">
              <p>Pair: <strong className="text-white">{tradeModal.pair.symbol}</strong></p>
              <p>Direction: <strong className={tradeModal.pair.directional_bias.includes("BUY") ? "text-[#00E676]" : "text-[#FF1744]"}>{tradeModal.pair.directional_bias.includes("BUY") ? "BUY" : "SELL"}</strong></p>
              <p>Entry Price: <strong className="text-white">${formatPrice(tradeModal.pair.suggested_entry)}</strong></p>
            </div>
            
            <div className="mb-6">
              <label className="block text-xs font-bold text-[#E6E9EF] mb-2 font-mono uppercase">Trading Amount (USDT)</label>
              <input 
                type="number"
                min="10"
                step="10"
                value={tradeModal.amount}
                onChange={(e) => setTradeModal({...tradeModal, amount: parseFloat(e.target.value) || 0})}
                className="w-full bg-[#0B0E13] border border-[#232833] rounded px-3 py-2 text-[#E6E9EF] focus:outline-none focus:border-[#3DDBD9] font-mono"
              />
              {tradeModal.mode === "DEMO" && tradeModal.amount > demoBalance && (
                <p className="text-[#FF1744] text-xs mt-1 font-mono">Amount exceeds available demo balance (${demoBalance.toLocaleString()})</p>
              )}
            </div>
            
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setTradeModal({...tradeModal, isOpen: false, pair: null})}
                className="px-4 py-2 font-bold uppercase tracking-wider text-white bg-transparent hover:bg-[#1E1E28] border border-[#232833] transition-all rounded text-xs font-mono"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (tradeModal.mode === "DEMO") executeDemoTrade(tradeModal.pair!, tradeModal.amount);
                  else executeLiveTrade(tradeModal.pair!, tradeModal.amount);
                  setTradeModal({...tradeModal, isOpen: false, pair: null});
                }}
                disabled={tradeModal.mode === "DEMO" && tradeModal.amount > demoBalance}
                className="px-4 py-2 font-bold uppercase tracking-wider text-[#0B0C10] bg-[#3DDBD9] hover:bg-[#2CBDBA] transition-all rounded text-xs shadow-[0_0_10px_rgba(61,219,217,0.3)] font-mono disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Trade
              </button>
            </div>
          </div>
        </div>
      )}

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
                className="bg-[#12161D] border border-[#1F2833] text-white px-3 py-1 rounded font-mono font-bold outline-none cursor-pointer hover:border-[#3DDBD9] transition-all"
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
              <select
                className="bg-[#0B0E13] border border-[#232833] text-[#E6E9EF] px-3 py-1 rounded font-mono font-bold text-xs outline-none cursor-pointer hover:border-[#3DDBD9] transition-all"
                value={timeframe}
                onChange={(e) => handleSetTimeframe(e.target.value)}
              >
                {['1s', '1m', '5m', '15m', '1h', '4h', '6h', '12h', '1d', '1year'].map(tf => (
                  <option key={tf} value={tf}>{tf}</option>
                ))}
              </select>
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
                    <div>Entry: <span className="text-white block mt-0.5 font-bold">${formatPrice(item.suggested_entry)}</span></div>
                    <div>SL: <span className="text-[#FF1744] block mt-0.5 font-bold">${formatPrice(item.suggested_sl)}</span></div>
                    <div>TP: <span className="text-[#00E676] block mt-0.5 font-bold">${formatPrice(item.suggested_tp)}</span></div>
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
                        onClick={() => setTradeModal({ isOpen: true, pair: item, amount: 100, mode: "DEMO" })}
                        className={`flex-1 py-1.5 text-[#0B0C10] font-bold text-xs font-mono rounded transition-colors shadow-sm ${item.directional_bias.includes("BUY") ? "bg-[#00E676] hover:bg-[#66FCF1]" : "bg-[#FF1744] text-white hover:bg-[#ff4d6d]"}`}
                      >
                        Demo {item.directional_bias.includes("BUY") ? "Buy" : "Sell"}
                      </button>
                    ) : (
                      <button
                        onClick={() => setTradeModal({ isOpen: true, pair: item, amount: 100, mode: "LIVE" })}
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
