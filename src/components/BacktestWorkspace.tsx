"use client";
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { createChart, ColorType, IChartApi, ISeriesApi, LineSeries } from 'lightweight-charts';
import { TRADABLE_PAIRS } from "../App";

export default function BacktestWorkspace() {
  const [activeTab, setActiveTab] = useState<'standard' | 'walk-forward'>('standard');
  
  // Standard Backtest State
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

  // Walk-Forward State
  const [wfParams, setWfParams] = useState({
    train_size: 60,
    test_size: 30,
    initial_balance: 10000
  });
  const [wfLoading, setWfLoading] = useState(false);
  const [wfReport, setWfReport] = useState<any>(null);
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const equitySeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const handleRun = async () => {
    setLoading(true);
    toast("Starting standard backtest...");
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
      if (res.ok && data.report) {
        setReport(data.report);
        toast.success("Standard backtest completed successfully!");
      } else {
        toast.error(`Backtest failed: ${data.error || res.status}`);
      }
    } catch (err: any) {
      toast.error(`Error running backtest: ${err.message}`);
      console.error(err);
    }
    setLoading(false);
  };

  const handleRunWalkForward = async () => {
    setWfLoading(true);
    toast("Launching Walk-Forward out-of-sample sweeps...");
    try {
      const res = await fetch('/api/backtest/walk-forward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: config.symbol,
          timeframe: config.timeframe,
          initial_balance: wfParams.initial_balance,
          train_size: wfParams.train_size,
          test_size: wfParams.test_size
        })
      });
      const data = await res.json();
      if (res.ok && data.report) {
        setWfReport(data);
        toast.success("Walk-Forward rolling validation completed!");
      } else {
        toast.error(`Walk-forward failed: ${data.error || res.status}`);
      }
    } catch (err: any) {
      toast.error(`Error running walk-forward: ${err.message}`);
      console.error(err);
    }
    setWfLoading(false);
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
  }, [report, activeTab]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto font-mono text-[#E6E9EF]">
      <div className="bg-[#0B0C10] p-6 rounded-lg border-4 border-[#1F2833] shadow-2xl">
        
        {/* Tab Headers */}
        <div className="flex border-b border-[#1F2833] mb-6 gap-2">
          <button 
            onClick={() => setActiveTab('standard')}
            className={`px-6 py-3 font-bold uppercase tracking-wider text-sm border-t-2 border-x-2 transition-all ${
              activeTab === 'standard' 
                ? 'bg-[#1F2833] border-[#66FCF1] text-white' 
                : 'border-transparent text-[#838C9C] hover:text-white'
            }`}
          >
            Standard Backtest
          </button>
          <button 
            onClick={() => setActiveTab('walk-forward')}
            className={`px-6 py-3 font-bold uppercase tracking-wider text-sm border-t-2 border-x-2 transition-all ${
              activeTab === 'walk-forward' 
                ? 'bg-[#1F2833] border-[#66FCF1] text-white' 
                : 'border-transparent text-[#838C9C] hover:text-white'
            }`}
          >
            Walk-Forward Validation
          </button>
        </div>

        {activeTab === 'standard' ? (
          <div>
            <h2 className="text-xl font-bold text-white tracking-widest uppercase border-b border-[#1F2833] pb-3 mb-6">Standard Backtester</h2>
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
                    <p className="text-xl font-bold text-[#00E676]">{report.total_return_pct?.toFixed(2)}%</p>
                  </div>
                  <div className="bg-[#1F2833] p-4 border border-[#0B0C10]">
                    <p className="text-xs text-[#838C9C] uppercase mb-1">Max Drawdown</p>
                    <p className="text-xl font-bold text-[#FF1744]">{report.max_drawdown_pct?.toFixed(2)}%</p>
                  </div>
                  <div className="bg-[#1F2833] p-4 border border-[#0B0C10]">
                    <p className="text-xs text-[#838C9C] uppercase mb-1">Win Rate</p>
                    <p className="text-xl font-bold text-white">{report.win_rate_pct?.toFixed(2)}%</p>
                  </div>
                  <div className="bg-[#1F2833] p-4 border border-[#0B0C10]">
                    <p className="text-xs text-[#838C9C] uppercase mb-1">Sharpe Ratio</p>
                    <p className="text-xl font-bold text-white">{report.sharpe_ratio?.toFixed(2)}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-[#66FCF1] uppercase mb-4">Equity Curve</h3>
                  <div className="w-full bg-[#12161D] border border-[#232833] overflow-hidden" ref={chartContainerRef}></div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold text-white tracking-widest uppercase border-b border-[#1F2833] pb-3 mb-6">Walk-Forward Robustness Sweeper</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
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
                    <option value="15m">15 minutes</option>
                    <option value="1h">1 hour</option>
                  </select>
                </div>
                <div className="flex flex-col space-y-1">
                  <label className="text-xs text-[#66FCF1] uppercase">Train Window (bars)</label>
                  <input type="number" value={wfParams.train_size} onChange={e => setWfParams({...wfParams, train_size: Number(e.target.value)})} className="bg-[#1F2833] border border-[#0B0C10] p-2 text-sm text-white focus:outline-none focus:border-[#45A29E]" />
                </div>
                <div className="flex flex-col space-y-1">
                  <label className="text-xs text-[#66FCF1] uppercase">Test Window (bars)</label>
                  <input type="number" value={wfParams.test_size} onChange={e => setWfParams({...wfParams, test_size: Number(e.target.value)})} className="bg-[#1F2833] border border-[#0B0C10] p-2 text-sm text-white focus:outline-none focus:border-[#45A29E]" />
                </div>
                <div className="flex items-end">
                    <button onClick={handleRunWalkForward} disabled={wfLoading} className="w-full bg-[#66FCF1] hover:bg-[#45A29E] text-[#0B0C10] font-bold uppercase tracking-wider py-2 px-4 transition-colors">
                        {wfLoading ? 'Sweeping...' : 'Run Walk-Forward'}
                    </button>
                </div>
            </div>

            {wfReport && (
              <div className="mt-8 space-y-6">
                
                {/* Look-Ahead Bias Guard Badge */}
                <div className={`p-4 border-2 ${wfReport.biasReport?.passed ? 'bg-[#1b4332]/30 border-[#2d6a4f] text-[#52b788]' : 'bg-[#5c1d1d]/30 border-[#800f2f] text-[#ff758f]'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🛡️</span>
                    <h3 className="font-bold uppercase tracking-wider">Zero Look-Ahead Bias Guard Check</h3>
                  </div>
                  <p className="text-sm">
                    {wfReport.biasReport?.passed 
                      ? "VERIFIED PASSED: Past signal logic evaluated identically before and after modifying future candles. Zero future leakage exists in indicators."
                      : "FAILED: Future indicator data leaked to historical signal outputs."}
                  </p>
                  <div className="mt-2 bg-[#0B0C10] p-2 rounded text-xs text-[#838C9C] max-h-24 overflow-y-auto font-mono">
                    {wfReport.biasReport?.logs?.map((log: string, idx: number) => (
                      <div key={idx}>{log}</div>
                    ))}
                  </div>
                </div>

                {/* Overall Out-Of-Sample Summary Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#1F2833] p-4 border border-[#0B0C10]">
                    <p className="text-xs text-[#838C9C] uppercase mb-1">Combined Sharpe</p>
                    <p className="text-xl font-bold text-[#66FCF1]">{wfReport.report?.overallSharpe?.toFixed(2)}</p>
                  </div>
                  <div className="bg-[#1F2833] p-4 border border-[#0B0C10]">
                    <p className="text-xs text-[#838C9C] uppercase mb-1">Combined Sortino</p>
                    <p className="text-xl font-bold text-[#66FCF1]">{wfReport.report?.overallSortino?.toFixed(2)}</p>
                  </div>
                  <div className="bg-[#1F2833] p-4 border border-[#0B0C10]">
                    <p className="text-xs text-[#838C9C] uppercase mb-1">Max Drawdown</p>
                    <p className="text-xl font-bold text-[#FF1744]">{wfReport.report?.overallMaxDrawdownPct?.toFixed(2)}%</p>
                  </div>
                  <div className="bg-[#1F2833] p-4 border border-[#0B0C10]">
                    <p className="text-xs text-[#838C9C] uppercase mb-1">Win Rate</p>
                    <p className="text-xl font-bold text-[#00E676]">{wfReport.report?.overallWinRatePct?.toFixed(2)}%</p>
                  </div>
                  <div className="bg-[#1F2833] p-4 border border-[#0B0C10]">
                    <p className="text-xs text-[#838C9C] uppercase mb-1">Profit Factor</p>
                    <p className="text-xl font-bold text-white">{wfReport.report?.overallProfitFactor?.toFixed(2)}</p>
                  </div>
                  <div className="bg-[#1F2833] p-4 border border-[#0B0C10]">
                    <p className="text-xs text-[#838C9C] uppercase mb-1">Expectancy</p>
                    <p className="text-xl font-bold text-white">${wfReport.report?.overallExpectancy?.toFixed(2)}</p>
                  </div>
                  <div className="bg-[#1F2833] p-4 border border-[#0B0C10]">
                    <p className="text-xs text-[#838C9C] uppercase mb-1">Trades Run</p>
                    <p className="text-xl font-bold text-white">{wfReport.report?.overallTradeCount}</p>
                  </div>
                  <div className="bg-[#1F2833] p-4 border border-[#0B0C10]">
                    <p className="text-xs text-[#838C9C] uppercase mb-1">Avg Signal Score</p>
                    <p className="text-xl font-bold text-white">{wfReport.report?.averageSignalScore}</p>
                  </div>
                </div>

                {/* Sliced Performance breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Performance by Strategy */}
                  <div className="bg-[#131722] p-4 border border-[#1F2833]">
                    <h3 className="text-xs text-[#66FCF1] font-bold uppercase border-b border-[#1F2833] pb-2 mb-3">Performance by Strategy</h3>
                    <div className="space-y-3">
                      {wfReport.report?.performanceByStrategy?.map((s: any) => (
                        <div key={s.strategy} className="flex justify-between items-center text-sm border-b border-[#1F2833]/50 pb-1">
                          <span className="text-xs text-[#838C9C] truncate max-w-[150px]" title={s.strategy}>{s.strategy}</span>
                          <div className="text-right">
                            <span className="text-white font-bold">{s.winRatePct.toFixed(1)}% WR</span>
                            <span className={`ml-2 font-bold ${s.netPnL >= 0 ? 'text-[#00E676]' : 'text-[#FF1744]'}`}>
                              {s.netPnL >= 0 ? '+' : ''}${s.netPnL.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Performance by Asset */}
                  <div className="bg-[#131722] p-4 border border-[#1F2833]">
                    <h3 className="text-xs text-[#66FCF1] font-bold uppercase border-b border-[#1F2833] pb-2 mb-3">Performance by Asset</h3>
                    <div className="space-y-3">
                      {wfReport.report?.performanceByAsset?.map((a: any) => (
                        <div key={a.asset} className="flex justify-between items-center text-sm border-b border-[#1F2833]/50 pb-1">
                          <span className="text-xs text-[#838C9C]">{a.asset}</span>
                          <div className="text-right">
                            <span className="text-white font-bold">{a.winRatePct.toFixed(1)}% WR</span>
                            <span className={`ml-2 font-bold ${a.netPnL >= 0 ? 'text-[#00E676]' : 'text-[#FF1744]'}`}>
                              {a.netPnL >= 0 ? '+' : ''}${a.netPnL.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Performance by Regime */}
                  <div className="bg-[#131722] p-4 border border-[#1F2833]">
                    <h3 className="text-xs text-[#66FCF1] font-bold uppercase border-b border-[#1F2833] pb-2 mb-3">Performance by Regime</h3>
                    <div className="space-y-3">
                      {wfReport.report?.performanceByRegime?.map((r: any) => (
                        <div key={r.regime} className="flex justify-between items-center text-sm border-b border-[#1F2833]/50 pb-1">
                          <span className="text-xs text-[#838C9C] uppercase">{r.regime}</span>
                          <div className="text-right">
                            <span className="text-white font-bold">{r.winRatePct.toFixed(1)}% WR</span>
                            <span className={`ml-2 font-bold ${r.netPnL >= 0 ? 'text-[#00E676]' : 'text-[#FF1744]'}`}>
                              {r.netPnL >= 0 ? '+' : ''}${r.netPnL.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Rolling Folds / Slices Details */}
                <div>
                  <h3 className="text-sm text-[#66FCF1] font-bold uppercase mb-3">Rolling Fold Optimization Log</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-white border-collapse">
                      <thead>
                        <tr className="bg-[#1F2833] text-[#838C9C] uppercase">
                          <th className="p-3 border border-[#0B0C10]">Fold Name</th>
                          <th className="p-3 border border-[#0B0C10]">Optimized Score Threshold</th>
                          <th className="p-3 border border-[#0B0C10]">In-Sample (Train) Sharpe</th>
                          <th className="p-3 border border-[#0B0C10]">Out-of-Sample (Test) Sharpe</th>
                          <th className="p-3 border border-[#0B0C10]">Test Trade Count</th>
                          <th className="p-3 border border-[#0B0C10]">Test Net Profit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wfReport.report?.windows?.map((w: any, idx: number) => (
                          <tr key={idx} className="bg-[#131722] hover:bg-[#1F2833]/50 border-b border-[#1F2833]">
                            <td className="p-3 font-semibold text-white">{w.windowName}</td>
                            <td className="p-3 text-[#66FCF1]">{w.optimizedParams?.minimumSignalScore ?? 55} points</td>
                            <td className="p-3 text-[#00E676]">{w.trainMetrics?.Sharpe?.toFixed(2) ?? "0.00"}</td>
                            <td className="p-3 font-bold">{w.testMetrics?.Sharpe?.toFixed(2) ?? "0.00"}</td>
                            <td className="p-3">{w.testMetrics?.tradeCount}</td>
                            <td className={`p-3 font-bold ${w.testMetrics?.netPnL >= 0 ? 'text-[#00E676]' : 'text-[#FF1744]'}`}>
                              {w.testMetrics?.netPnL >= 0 ? '+' : ''}${w.testMetrics?.netPnL?.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
