"use client";
import React, { useState, useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, LineSeries } from 'lightweight-charts';
import { TRADABLE_PAIRS } from "../App";

export default function BacktestWorkspace() {
  const [config, setConfig] = useState({
    symbol: "BTCUSDT",
    timeframe: "1h",
    start_time: "2023-01-01T00:00:00Z",
    end_time: "2023-12-31T23:59:59Z",
    initial_balance: 10000,
    fast_ema: 10,
    slow_ema: 50
  });

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const equitySeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const handleRun = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: config.symbol,
          timeframe: config.timeframe,
          start_time: config.start_time,
          end_time: config.end_time,
          initial_balance: config.initial_balance,
          strategy_config: {
            fast_ema: config.fast_ema,
            slow_ema: config.slow_ema
          }
        })
      });
      const data = await res.json();
      if (data.report) {
        setReport(data.report);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!chartContainerRef.current || !report || !report.equity_curve) return;
    
    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: "#12161D" }, textColor: "#838C9C", fontFamily: '"JetBrains Mono", monospace' },
      grid: { vertLines: { color: "#232833" }, horzLines: { color: "#232833" } },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: { timeVisible: true, borderColor: "#232833" },
      rightPriceScale: { borderColor: "#232833" }
    });

    const equitySeries = chart.addSeries(LineSeries, {
        color: '#00E676',
        lineWidth: 2,
    });

    const formattedData = report.equity_curve.map((d: any) => ({
        time: Math.floor(new Date(d.time).getTime() / 1000),
        value: d.equity
    })).sort((a: any, b: any) => a.time - b.time);

    equitySeries.setData(formattedData);
    
    chartRef.current = chart;
    equitySeriesRef.current = equitySeries;

    const handleResize = () => {
      chart.applyOptions({
        width: chartContainerRef.current?.clientWidth ?? 800,
        height: 400,
      });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [report]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto font-mono text-[#E6E9EF]">
      <div className="bg-[#0B0C10] p-6 rounded-lg border-4 border-[#1F2833] shadow-2xl">
        <h2 className="text-2xl font-bold text-white tracking-widest uppercase border-b-2 border-[#1F2833] pb-4 mb-6">Backtesting Workspace</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="flex flex-col space-y-1">
              <label className="text-xs text-[#66FCF1] uppercase">Symbol</label>
              <select value={config.symbol} onChange={e => setConfig({...config, symbol: e.target.value})} className="bg-[#1F2833] border border-[#0B0C10] p-2 text-sm text-white focus:outline-none focus:border-[#45A29E]">
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
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-xs text-[#66FCF1] uppercase">Timeframe</label>
              <select value={config.timeframe} onChange={e => setConfig({...config, timeframe: e.target.value})} className="bg-[#1F2833] border border-[#0B0C10] p-2 text-sm text-white focus:outline-none focus:border-[#45A29E]">
                <option value="1m">1 minute</option>
                <option value="5m">5 minutes</option>
                <option value="15m">15 minutes</option>
                <option value="1h">1 hour</option>
                <option value="4h">4 hours</option>
                <option value="1d">1 day</option>
                <option value="1w">1 week</option>
              </select>
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-xs text-[#66FCF1] uppercase">Start Date</label>
              <input type="date" value={config.start_time.split('T')[0]} onChange={e => setConfig({...config, start_time: `${e.target.value}T00:00:00Z`})} className="bg-[#1F2833] border border-[#0B0C10] p-2 text-sm text-white focus:outline-none focus:border-[#45A29E]" />
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-xs text-[#66FCF1] uppercase">End Date</label>
              <input type="date" value={config.end_time.split('T')[0]} onChange={e => setConfig({...config, end_time: `${e.target.value}T23:59:59Z`})} className="bg-[#1F2833] border border-[#0B0C10] p-2 text-sm text-white focus:outline-none focus:border-[#45A29E]" />
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-xs text-[#66FCF1] uppercase">Init Balance</label>
              <input type="number" value={config.initial_balance} onChange={e => setConfig({...config, initial_balance: Number(e.target.value)})} className="bg-[#1F2833] border border-[#0B0C10] p-2 text-sm text-white focus:outline-none focus:border-[#45A29E]" />
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-xs text-[#66FCF1] uppercase">Fast EMA</label>
              <input type="number" value={config.fast_ema} onChange={e => setConfig({...config, fast_ema: Number(e.target.value)})} className="bg-[#1F2833] border border-[#0B0C10] p-2 text-sm text-white focus:outline-none focus:border-[#45A29E]" />
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-xs text-[#66FCF1] uppercase">Slow EMA</label>
              <input type="number" value={config.slow_ema} onChange={e => setConfig({...config, slow_ema: Number(e.target.value)})} className="bg-[#1F2833] border border-[#0B0C10] p-2 text-sm text-white focus:outline-none focus:border-[#45A29E]" />
            </div>
            <div className="flex items-end">
                <button onClick={handleRun} disabled={loading} className="w-full bg-[#66FCF1] hover:bg-[#45A29E] text-[#0B0C10] font-bold uppercase tracking-wider py-2 px-4 transition-colors">
                    {loading ? 'Running...' : 'Run Backtest'}
                </button>
            </div>
        </div>

        {report && (
          <div className="mt-8 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#1F2833] p-4 border border-[#0B0C10]">
                <p className="text-xs text-[#838C9C] uppercase mb-1">Total Return</p>
                <p className="text-xl font-bold text-[#00E676]">{report.total_return_pct.toFixed(2)}%</p>
              </div>
              <div className="bg-[#1F2833] p-4 border border-[#0B0C10]">
                <p className="text-xs text-[#838C9C] uppercase mb-1">Max Drawdown</p>
                <p className="text-xl font-bold text-[#FF1744]">{report.max_drawdown_pct.toFixed(2)}%</p>
              </div>
              <div className="bg-[#1F2833] p-4 border border-[#0B0C10]">
                <p className="text-xs text-[#838C9C] uppercase mb-1">Win Rate</p>
                <p className="text-xl font-bold text-white">{report.win_rate_pct.toFixed(2)}%</p>
              </div>
              <div className="bg-[#1F2833] p-4 border border-[#0B0C10]">
                <p className="text-xs text-[#838C9C] uppercase mb-1">Sharpe Ratio</p>
                <p className="text-xl font-bold text-white">{report.sharpe_ratio.toFixed(2)}</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#66FCF1] uppercase mb-4">Equity Curve</h3>
              <div className="w-full bg-[#12161D] border border-[#232833] overflow-hidden" ref={chartContainerRef}></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
