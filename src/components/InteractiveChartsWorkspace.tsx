import { useRealtimeData } from "../hooks/useRealtimeData";
import { useLiveTrades } from "../hooks/useTradeState";
import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries, IPriceLine } from "lightweight-charts";
import { TRADABLE_PAIRS } from "../App";
import { formatPrice } from "../utils";
import { getPriceForSymbol } from "../utils/priceUtils";

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

let globalPricesForChart: Record<string, number> = {};

export default function InteractiveChartsWorkspace({ initialSymbol }: { initialSymbol?: string | null }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string>(initialSymbol || "BTCUSDT");
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>(["SWING_TRADING", "SMC_ICT"]);
  const [showSwingResearch, setShowSwingResearch] = useState<boolean>(false);
  const [showDayResearch, setShowDayResearch] = useState<boolean>(false);
  const [timeframe, setTimeframe] = useState("4h");
  const [activeMode, setActiveMode] = useState<"DEMO" | "LIVE">("DEMO");
  const [recommendations, setRecommendations] = useState<RecommendedPair[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [demoBalance, setDemoBalance] = useState<number>(10000.00);
  const [liveBalance, setLiveBalance] = useState<number>(50000.00);
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
  const prevPriceLinesSigRef = useRef<string>("");

  // Run Agent Scan
  const triggerAgentScan = async (overrideStrategies?: string[]) => {
    const strats = overrideStrategies || selectedStrategies;
    const stratParam = strats.join(",");
    setIsScanning(true);
    const toastId = toast.loading(`Initiating AI agent scan combining [${strats.length > 1 ? strats.length + ' Strategies' : strats[0]}]...`);
    try {
      const res = await fetch(`/api/agent-workspace/scan?mode=${activeMode}&strategy=${encodeURIComponent(stratParam)}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (res.ok) {
        setRecommendations(data.recommended_pairs || []);
        toast.success(`Agent scan complete [${strats.length > 1 ? 'Multi-Strategy Confluence: ' + strats.join(' + ') : strats[0]}]`, { id: toastId });
      } else {
        toast.error("Failed to run agent scan", { id: toastId });
      }
    } catch (err: any) {
      toast.error(`Agent scan error: ${err.message}`, { id: toastId });
      console.error("Failed to run agent scan:", err);
    } finally {
      setIsScanning(false);
    }
  };

  const fetchBalances = async () => {
    try {
      const res = await fetch("/api/account/balances", { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDemoBalance(data.demo.available_balance);
      setLiveBalance(data.live.available_balance);
    } catch (err) {
      console.warn("Failed to fetch balances:", err);
    }
  };

  const { prices } = useRealtimeData('prices');
  const { activeTrades: positions } = useLiveTrades();
  globalPricesForChart = prices;

  useEffect(() => {
      const active = positions.filter(p => p.status === 'OPEN');
      const closed = positions.filter(p => p.status === 'CLOSED');
      setActiveTrades(active);
      setClosedTrades(closed);
  }, [positions]);

  useEffect(() => {
    fetchBalances();
  }, []);

  // Update Price Lines when active trades or selected symbol changes
  useEffect(() => {
      if (!seriesRef.current) return;
      
      const relevantTrades = activeTrades.filter(t => t.symbol === selectedSymbol && t.account_mode === activeMode);
      const relevantClosedTrades = closedTrades.filter(t => t.symbol === selectedSymbol && t.account_mode === activeMode);

      const sig = [
        selectedSymbol,
        activeMode,
        relevantTrades.map(t => `${t.id}_${t.side}_${t.entry_price}_${t.stop_loss}_${t.take_profit}`).join(';'),
        relevantClosedTrades.map(t => `${t.id}_${t.opened_at}_${t.closed_at}_${t.realized_pnl}`).join(';')
      ].join('||');

      if (prevPriceLinesSigRef.current === sig) return;
      prevPriceLinesSigRef.current = sig;

      // Remove old price lines
      priceLinesRef.current.forEach(line => {
          try { seriesRef.current?.removePriceLine(line); } catch (e) {}
      });
      priceLinesRef.current = [];

      // Add new price lines for the selected symbol
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
      const livePrice = getPriceForSymbol(prices, pair.symbol) || pair.suggested_entry;
      const qty = parseFloat((amount / livePrice).toFixed(4));
      const res = await fetch("/api/agent-workspace/demo/place-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: 'no-store',
        body: JSON.stringify({
          symbol: pair.symbol,
          side: pair.directional_bias.includes("BUY") ? "BUY" : "SELL",
          qty: qty,
          amount: amount,
          price: livePrice,
          use_market_price: true,
          stop_loss: pair.suggested_sl,
          take_profit: pair.suggested_tp,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`[DEMO MODE] ${data.message || 'Trade executed successfully'}`);
        window.dispatchEvent(new CustomEvent("trade_updated"));
        window.dispatchEvent(new Event("balance_updated"));
        fetchBalances();
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
      const livePrice = getPriceForSymbol(prices, pair.symbol) || pair.suggested_entry;
      const qty = parseFloat((amount / livePrice).toFixed(4));
      const res = await fetch("/api/agent-workspace/live/place-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: 'no-store',
        body: JSON.stringify({
          symbol: pair.symbol,
          side: pair.directional_bias.includes("BUY") ? "BUY" : "SELL",
          qty: qty,
          amount: amount,
          price: livePrice,
          use_market_price: true,
          stop_loss: pair.suggested_sl,
          take_profit: pair.suggested_tp,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`[LIVE MODE] ${data.message || 'Trade executed successfully'}`);
        window.dispatchEvent(new CustomEvent("trade_updated"));
        window.dispatchEvent(new Event("balance_updated"));
        fetchBalances();
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

    const handleResize = (entries: ResizeObserverEntry[]) => {
      window.requestAnimationFrame(() => {
        if (!chartContainerRef.current) return;
        const newRect = entries[0].contentRect;
        chart.applyOptions({
          width: newRect.width,
          height: newRect.height,
        });
      });
    };
    
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);

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

        const bybitRes = await fetch(`/api/market/kline?category=${categoryParam}&symbol=${selectedSymbol}&interval=${intervalParams}&limit=500`, { cache: 'no-store' });
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

      const cleanSymbol = selectedSymbol.replace(/[\/-]/g, '').replace('OTC', '').toUpperCase();
      let binanceWsSymbol = cleanSymbol.toLowerCase();
      if (!binanceWsSymbol.endsWith("usdt") && (category === "crypto" || cleanSymbol.includes("USDT") || ["BTC", "ETH", "SOL", "XRP", "BNB", "ADA", "DOGE", "AVAX", "LINK", "DOT", "NEAR", "SUI", "APT", "MATIC", "LTC", "UNI", "ATOM", "ETC", "FIL", "ARB", "PEPE", "SHIB", "INJ", "RNDR", "OP", "TIA", "AAVE", "FET", "WIF"].includes(cleanSymbol))) {
          binanceWsSymbol += "usdt";
      }

      if (category === "crypto" && timeframe === "1s") {
          // Use Binance WebSocket for 1s data
          const wsUrl = `wss://stream.binance.com:9443/ws/${binanceWsSymbol}@kline_1s`;
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
                  const data = globalPricesForChart;
                  const targetPrice = getPriceForSymbol(data, selectedSymbol);
                  if (targetPrice) {
                      const newPrice = targetPrice;
                      
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
          // Connect directly to Binance WebSocket for crypto
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

          const wsUrl = `wss://stream.binance.com:9443/ws/${binanceWsSymbol}@kline_${wsInterval}`;
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
      if (resizeObserver) resizeObserver.disconnect();
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
              {tradeModal.mode === "LIVE" && tradeModal.amount > liveBalance && (
                <p className="text-[#FF1744] text-xs mt-1 font-mono">Amount exceeds available live balance (${liveBalance.toLocaleString()})</p>
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
                disabled={(tradeModal.mode === "DEMO" && tradeModal.amount > demoBalance) || (tradeModal.mode === "LIVE" && tradeModal.amount > liveBalance)}
                className="px-4 py-2 font-bold uppercase tracking-wider text-[#0B0C10] bg-[#3DDBD9] hover:bg-[#2CBDBA] transition-all rounded text-xs shadow-[0_0_10px_rgba(61,219,217,0.3)] font-mono disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Trade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="flex flex-col gap-4 mb-4 border-b border-[#1F2833] pb-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
          <div className="flex items-center gap-2 flex-wrap md:flex-nowrap w-full md:w-auto justify-between md:justify-end">
            <button
              onClick={() => setShowDayResearch(!showDayResearch)}
              className="px-3 py-1.5 bg-[#1F2833] hover:bg-[#FF6D00] hover:text-[#0B0C10] text-[#FF6D00] text-xs font-bold font-mono rounded border border-[#FF6D00]/40 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              🔥 DAY TRADING RESEARCH & PLAYBOOK
            </button>
            <button
              onClick={() => setShowSwingResearch(!showSwingResearch)}
              className="px-3 py-1.5 bg-[#1F2833] hover:bg-[#3DDBD9] hover:text-[#0B0C10] text-[#3DDBD9] text-xs font-bold font-mono rounded border border-[#3DDBD9]/40 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              📖 SWING TRADING PLAYBOOK
            </button>

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
              onClick={() => triggerAgentScan()}
              disabled={isScanning}
              className="px-4 py-2 bg-[#FFD600] text-[#0B0C10] text-xs font-bold font-mono rounded hover:bg-yellow-400 transition-all flex items-center gap-2 shadow-[0_0_10px_rgba(255,214,0,0.3)] cursor-pointer"
            >
              {isScanning ? "SCANNING..." : "⚡ RUN AGENT FORENSICS"}
            </button>
          </div>
        </div>

        {/* AI Strategy Selection & Combination Toolbar */}
        <div className="bg-[#12161D] border border-[#1F2833] rounded-lg p-3 flex flex-col gap-3 font-mono">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 border-b border-[#1F2833]/60 pb-2">
            <div className="flex items-center gap-2 text-xs text-white font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3DDBD9] animate-ping"></span>
              <span>AI Multi-Strategy Confluence Engine:</span>
              {selectedStrategies.length > 1 && (
                <span className="px-2 py-0.5 rounded text-[10px] bg-[#3DDBD9]/20 text-[#3DDBD9] border border-[#3DDBD9]/40 font-bold animate-pulse">
                  ⚡ {selectedStrategies.length} STRATEGIES COMBINED (+{(selectedStrategies.length * 3.5).toFixed(1)}% WIN CONFLUENCE BONUS)
                </span>
              )}
            </div>

            {/* Quick Multi-Strategy Presets */}
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="text-gray-400">Quick Combinations:</span>
              <button
                onClick={() => {
                  const combo = ["DAY_TRADING", "ORDER_FLOW", "SMC_ICT"];
                  setSelectedStrategies(combo);
                  setTimeframe("15m");
                  triggerAgentScan(combo);
                }}
                className="px-2 py-0.5 rounded bg-[#1F2833] text-[#FF6D00] hover:bg-[#FF6D00] hover:text-[#0B0C10] transition-all font-bold cursor-pointer"
              >
                🔥 Day Trading + Order Flow (15M)
              </button>
              <button
                onClick={() => {
                  const combo = ["SWING_TRADING", "SMC_ICT"];
                  setSelectedStrategies(combo);
                  setTimeframe("4h");
                  triggerAgentScan(combo);
                }}
                className="px-2 py-0.5 rounded bg-[#1F2833] text-[#3DDBD9] hover:bg-[#3DDBD9] hover:text-[#0B0C10] transition-all font-bold cursor-pointer"
              >
                🌊 Swing + ICT/SMC (4H)
              </button>
              <button
                onClick={() => {
                  const combo = ["DAY_TRADING", "SWING_TRADING", "SMC_ICT", "MEAN_REVERSION", "ORDER_FLOW", "TREND_FOLLOWING", "GRID_TRADING"];
                  setSelectedStrategies(combo);
                  triggerAgentScan(combo);
                }}
                className="px-2 py-0.5 rounded bg-gradient-to-r from-orange-500 via-teal-500 to-yellow-400 text-[#0B0C10] hover:opacity-90 transition-all font-bold cursor-pointer"
              >
                ⚡ MAX CONFLUENCE (ALL 7)
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 text-xs w-full">
            {[
              { id: "DAY_TRADING", name: "🔥 Day Trading (5M/15M)", desc: "VWAP Equilibrium & 9/20 EMA Breakouts" },
              { id: "SWING_TRADING", name: "🌊 Swing Trading (4H/1D)", desc: "Fib Retracements & Multi-Day Momentum" },
              { id: "SMC_ICT", name: "⚡ ICT / SMC", desc: "Fair Value Gaps & Order Blocks" },
              { id: "MEAN_REVERSION", name: "🔄 Mean Reversion", desc: "Bollinger & VWAP Overextension" },
              { id: "ORDER_FLOW", name: "📊 Order Flow", desc: "Volume Delta Imbalance" },
              { id: "TREND_FOLLOWING", name: "📈 Trend Breakout", desc: "20/50/200 EMA Golden Cross" },
              { id: "GRID_TRADING", name: "🧱 Grid Harvesting", desc: "ATR Channel Multi-Tier Grid" },
            ].map(strat => {
              const isSelected = selectedStrategies.includes(strat.id);
              return (
                <button
                  key={strat.id}
                  onClick={() => {
                    let nextStrats: string[];
                    if (isSelected) {
                      if (selectedStrategies.length === 1) {
                        toast.error("At least 1 strategy model must remain selected.");
                        return;
                      }
                      nextStrats = selectedStrategies.filter(s => s !== strat.id);
                    } else {
                      nextStrats = [...selectedStrategies, strat.id];
                    }
                    setSelectedStrategies(nextStrats);
                    if (nextStrats.includes("SWING_TRADING")) setTimeframe("4h");
                    triggerAgentScan(nextStrats);
                  }}
                  className={`px-3 py-1.5 rounded-md border text-left transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-[#3DDBD9] text-[#0B0C10] font-bold border-[#3DDBD9] shadow-[0_0_10px_rgba(61,219,217,0.3)]"
                      : "bg-[#0B0E13] text-[#838C9C] border-[#1F2833] hover:border-[#3DDBD9]/50 hover:text-white"
                  }`}
                >
                  <span>{isSelected ? "✓" : "+"}</span>
                  <span>{strat.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Day Trading Detailed Research Playbook Modal */}
      {showDayResearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#12161D] border-2 border-[#FF6D00] rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto font-mono text-sm space-y-5 shadow-[0_0_30px_rgba(255,109,0,0.25)]">
            <div className="flex justify-between items-center border-b border-[#232833] pb-3">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>🔥 DAY TRADING STRATEGY & INTRADAY PLAYBOOK</span>
                </h2>
                <p className="text-xs text-[#FF6D00] mt-0.5">Comprehensive Intraday Guide, Strategy Mechanics & Best Practices</p>
              </div>
              <button
                onClick={() => setShowDayResearch(false)}
                className="text-[#838C9C] hover:text-white font-bold px-2 py-1 bg-[#1F2833] rounded cursor-pointer"
              >
                ✕ CLOSE
              </button>
            </div>

            <div className="space-y-4 text-xs leading-relaxed text-[#E6E9EF]">
              <section className="bg-[#0B0E13] p-4 rounded-lg border border-[#232833]">
                <h3 className="text-sm font-bold text-[#FFD600] uppercase mb-2">1. What is Day Trading?</h3>
                <p>
                  Day trading is the high-frequency practice of executing positions strictly within the <strong>same trading day</strong>. All trades are closed before session end to eliminate overnight gap exposure. Day traders use <strong>5-Minute (5M) and 15-Minute (15M) timeframes</strong> to exploit short-term momentum, volatility spikes, and intraday mean reversions.
                </p>
              </section>

              <section className="bg-[#0B0E13] p-4 rounded-lg border border-[#232833]">
                <h3 className="text-sm font-bold text-[#FF6D00] uppercase mb-2">2. Core Intraday Day Trading Strategies</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  <div className="p-3 bg-[#12161D] rounded border border-[#1F2833]">
                    <strong className="text-white block mb-1">A. VWAP (Volume-Weighted Average Price) Pullback</strong>
                    <p className="text-gray-400">VWAP represents the intraday fair value benchmark. Traders buy when price retests VWAP from above with volume surge, treating VWAP as dynamic intraday support.</p>
                  </div>
                  <div className="p-3 bg-[#12161D] rounded border border-[#1F2833]">
                    <strong className="text-white block mb-1">B. 9/20 EMA Exponential Crossover</strong>
                    <p className="text-gray-400">Fast 9-period EMA crossing above 20-period EMA on 5M/15M charts signals intense directional velocity, confirming high-momentum breakouts.</p>
                  </div>
                  <div className="p-3 bg-[#12161D] rounded border border-[#1F2833]">
                    <strong className="text-white block mb-1">C. Opening Range Breakout (ORB)</strong>
                    <p className="text-gray-400">Monitors the high and low of the initial 15-30 minutes of trading. Positions enter when price decisively breaks out with order book bid/ask delta imbalance.</p>
                  </div>
                  <div className="p-3 bg-[#12161D] rounded border border-[#1F2833]">
                    <strong className="text-white block mb-1">D. RSI Momentum & MACD Confluence</strong>
                    <p className="text-gray-400">5M RSI bouncing off 45 support combined with MACD histogram bullish flip confirms strong trend continuation on low-risk intraday pullbacks.</p>
                  </div>
                </div>
              </section>

              <section className="bg-[#0B0E13] p-4 rounded-lg border border-[#232833]">
                <h3 className="text-sm font-bold text-[#00E676] uppercase mb-2">3. Intraday Risk Management & Execution Rules</h3>
                <ul className="list-disc list-inside space-y-1.5 text-gray-300">
                  <li><strong>Minimum 1:2.0 Risk-to-Reward Ratio:</strong> Intraday target profits must exceed at least 2.0x potential stop loss distance.</li>
                  <li><strong>Tight ATR Trailing Stop Losses:</strong> Place stops behind recent 5M pivot highs/lows or 1.5x ATR to contain drawdowns.</li>
                  <li><strong>Strict 1% Account Risk Limit:</strong> Never risk more than 1% of total account balance on any single day trade.</li>
                  <li><strong>Zero Overnight Risk:</strong> Liquidate all positions prior to daily market close regardless of current floating PnL.</li>
                  <li><strong>Multi-Timeframe Context:</strong> Use 15M chart for macro intraday directional bias and 5M chart for precise entry timing.</li>
                </ul>
              </section>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setSelectedStrategies(["DAY_TRADING"]);
                    setTimeframe("15m");
                    triggerAgentScan(["DAY_TRADING"]);
                    setShowDayResearch(false);
                    toast.success("Applied Day Trading Strategy & 15M Timeframe!");
                  }}
                  className="px-5 py-2.5 bg-[#FF6D00] text-black font-bold rounded hover:bg-[#E66200] transition-all cursor-pointer"
                >
                  ⚡ APPLY DAY TRADING MODEL NOW
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Swing Trading Detailed Research Playbook Modal */}
      {showSwingResearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#12161D] border-2 border-[#3DDBD9] rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto font-mono text-sm space-y-5 shadow-[0_0_30px_rgba(61,219,217,0.2)]">
            <div className="flex justify-between items-center border-b border-[#232833] pb-3">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>🌊 SWING TRADING RESEARCH & STRATEGY PLAYBOOK</span>
                </h2>
                <p className="text-xs text-[#3DDBD9] mt-0.5">Comprehensive Guide & Best Practices for Multi-Day Positions</p>
              </div>
              <button
                onClick={() => setShowSwingResearch(false)}
                className="text-[#838C9C] hover:text-white font-bold px-2 py-1 bg-[#1F2833] rounded"
              >
                ✕ CLOSE
              </button>
            </div>

            <div className="space-y-4 text-xs leading-relaxed text-[#E6E9EF]">
              <section className="bg-[#0B0E13] p-4 rounded-lg border border-[#232833]">
                <h3 className="text-sm font-bold text-[#FFD600] uppercase mb-2">1. What is Swing Trading?</h3>
                <p>
                  Swing trading is a speculative style where traders hold positions across <strong>2 days to several weeks</strong> to capture expected price "swings" or momentum moves. Unlike day trading (which closes before market close) or position trading (held for months/years), swing trading targets mid-term price swings on <strong>4-Hour (4H) and Daily (1D) timeframes</strong>.
                </p>
              </section>

              <section className="bg-[#0B0E13] p-4 rounded-lg border border-[#232833]">
                <h3 className="text-sm font-bold text-[#3DDBD9] uppercase mb-2">2. Core Types & Ways of Swing Trading</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  <div className="p-3 bg-[#12161D] rounded border border-[#1F2833]">
                    <strong className="text-white block mb-1">A. Trend-Following Swing Trading</strong>
                    <p className="text-gray-400">Identifies sustained market trends using 20/50/200 EMAs. Traders enter on minor pullbacks in the direction of the dominant daily trend (Higher Highs & Higher Lows).</p>
                  </div>
                  <div className="p-3 bg-[#12161D] rounded border border-[#1F2833]">
                    <strong className="text-white block mb-1">B. Fibonacci & Structural Retest</strong>
                    <p className="text-gray-400">Measures swing highs/lows using Golden Ratio Fibonacci retracements (50% & 61.8%). Enters at key horizontal support retests with high R:R ratios.</p>
                  </div>
                  <div className="p-3 bg-[#12161D] rounded border border-[#1F2833]">
                    <strong className="text-white block mb-1">C. Breakout Swing Trading</strong>
                    <p className="text-gray-400">Monitors consolidation ranges, flags, and pennants. Position is initiated when price breaks key resistance with strong institutional volume surge.</p>
                  </div>
                  <div className="p-3 bg-[#12161D] rounded border border-[#1F2833]">
                    <strong className="text-white block mb-1">D. Counter-Trend Reversal Swing</strong>
                    <p className="text-gray-400">Identifies exhausted trends using RSI momentum divergences and 2.5 StdDev Bollinger extensions at key multi-month daily support levels.</p>
                  </div>
                </div>
              </section>

              <section className="bg-[#0B0E13] p-4 rounded-lg border border-[#232833]">
                <h3 className="text-sm font-bold text-[#00E676] uppercase mb-2">3. Best Practices & Risk Management Rules</h3>
                <ul className="list-disc list-inside space-y-1.5 text-gray-300">
                  <li><strong>Minimum 1:2.5 Risk-to-Reward Ratio:</strong> Swing trades must target at least 2.5x potential reward relative to initial risk.</li>
                  <li><strong>Multi-Timeframe Confluence:</strong> Always determine macro trend bias on Daily (1D), then refine entries on 4H/1H candles.</li>
                  <li><strong>Stop Loss Placement:</strong> Place stops slightly beyond structural swing highs/lows or 2x ATR (Average True Range) to withstand noise.</li>
                  <li><strong>Position Sizing:</strong> Risk no more than 1-2% of total account capital per swing setup.</li>
                  <li><strong>Partial Take-Profits:</strong> Scale out 50% profit at TP1 (local structural pivot) and move Stop-Loss to Breakeven.</li>
                </ul>
              </section>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setSelectedStrategies(["SWING_TRADING"]);
                    setTimeframe("4h");
                    triggerAgentScan(["SWING_TRADING"]);
                    setShowSwingResearch(false);
                    toast.success("Applied Swing Trading Strategy & 4H Timeframe!");
                  }}
                  className="px-5 py-2.5 bg-[#3DDBD9] text-[#0B0C10] font-bold rounded hover:bg-[#2CBDBA] transition-all"
                >
                  ⚡ APPLY SWING TRADING MODEL NOW
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              {activeMode === "DEMO" ? "Demo" : "Live"} Balance: <span className="text-white">${(activeMode === "DEMO" ? demoBalance : liveBalance).toLocaleString()} USDT</span>
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
                  <div>
                    <button
                      onClick={() => handleSelectPair(item.symbol)}
                      className="w-full py-1.5 bg-[#1F2833] hover:bg-[#3DDBD9] hover:text-[#0B0C10] text-white text-xs font-bold font-mono rounded transition-colors"
                    >
                      View Chart
                    </button>
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
