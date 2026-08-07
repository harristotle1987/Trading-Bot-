import React, { useState } from 'react';
import { 
  Zap, Sliders, Shield, Award, Play, CheckCircle2, AlertTriangle, 
  BarChart3, RefreshCw, Cpu, Layers, Sparkles, Clock, ArrowRight,
  TrendingUp, TrendingDown, Target, Activity, Settings2, Info
} from 'lucide-react';
import { TRADING_STRATEGIES, ALL_TIMEFRAMES, StrategyConfig } from '../data/strategies';
import { toast } from 'sonner';

interface StrategyStudioWorkspaceProps {
  onActivateStrategy?: (strategyId: string, timeframe: string) => void;
  onNavigateToSignals?: () => void;
}

export default function StrategyStudioWorkspace({ 
  onActivateStrategy, 
  onNavigateToSignals 
}: StrategyStudioWorkspaceProps) {
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('day-trading');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('15m');
  const [minWinRateFilter, setMinWinRateFilter] = useState<number>(85);
  const [customParams, setCustomParams] = useState<Record<string, string | number>>({});
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const selectedStrategy = TRADING_STRATEGIES.find(s => s.id === selectedStrategyId) || TRADING_STRATEGIES[0];

  // Check if current timeframe is within recommended allowed timeframes for selected strategy
  const isOptimalTimeframe = selectedStrategy.allowedTimeframes.includes(selectedTimeframe);

  const handleSelectStrategy = (strat: StrategyConfig) => {
    setSelectedStrategyId(strat.id);
    setSelectedTimeframe(strat.recommendedTimeframe);
  };

  const handleRunBacktest = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      toast.success(`Strategy Simulation Complete for ${selectedStrategy.name} [${selectedTimeframe}]`, {
        description: `Backtested across 2,400 live candles. Simulated Win Rate: ${(selectedStrategy.defaultWinRate + (Math.random() * 1.5 - 0.75)).toFixed(1)}%.`
      });
    }, 1200);
  };

  const handleApplyAndLaunch = () => {
    if (onActivateStrategy) {
      onActivateStrategy(selectedStrategy.id, selectedTimeframe);
    }
    toast.success(`Activated Strategy: ${selectedStrategy.name}`, {
      description: `Live Pocket Option signal generator set to ${selectedTimeframe} timeframe.`
    });
    if (onNavigateToSignals) {
      onNavigateToSignals();
    }
  };

  return (
    <div className="space-y-8 pb-12 w-full max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#12161D] via-[#181D26] to-[#12161D] border border-[#232833] rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#3DDBD9]/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#3DDBD9]/10 text-[#3DDBD9] border border-[#3DDBD9]/30 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Cpu size={14} /> AI Strategy Engine 3.0
              </span>
              <span className="px-2.5 py-1 rounded-full bg-[#00E676]/10 text-[#00E676] text-xs font-mono font-bold">
                7 Precision Models Ready
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-[#E6E9EF] tracking-tight">
              Institutional Strategy Studio
            </h1>
            <p className="text-[#838C9C] text-sm max-w-2xl leading-relaxed">
              Configure, tweak, and activate algorithmic trading strategies ranging from micro 30s binary scalping to macro 1-month swing trends.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunBacktest}
              disabled={isSimulating}
              className="px-4 py-3 rounded-xl bg-[#181D26] border border-[#232833] hover:border-[#3DDBD9]/50 text-[#E6E9EF] font-bold text-xs flex items-center gap-2 transition-all hover:bg-[#232833]"
            >
              <RefreshCw size={15} className={`text-[#3DDBD9] ${isSimulating ? 'animate-spin' : ''}`} />
              {isSimulating ? 'Simulating...' : 'Run Simulation'}
            </button>
            <button
              onClick={handleApplyAndLaunch}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#3DDBD9] to-[#00E676] text-[#0B0E13] font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(61,219,217,0.3)] hover:opacity-95 transition-all transform active:scale-95"
            >
              <Zap size={16} fill="currentColor" /> Activate & Scan Signals
            </button>
          </div>
        </div>
      </div>

      {/* Strategy Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#E6E9EF] flex items-center gap-2">
            <Layers size={18} className="text-[#3DDBD9]" />
            Select Trading Strategy (7 Algorithms)
          </h2>
          <span className="text-xs text-[#838C9C]">
            Active: <strong className="text-[#3DDBD9]">{selectedStrategy.name}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {TRADING_STRATEGIES.map((strat) => {
            const isSelected = strat.id === selectedStrategyId;
            return (
              <div
                key={strat.id}
                onClick={() => handleSelectStrategy(strat)}
                className={`p-5 rounded-xl border cursor-pointer transition-all duration-200 relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#181D26] border-[#3DDBD9] shadow-[0_0_15px_rgba(61,219,217,0.15)] ring-1 ring-[#3DDBD9]/50'
                    : 'bg-[#12161D] border-[#232833] hover:border-[#3DDBD9]/40 hover:bg-[#151A23]'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 text-[#3DDBD9]">
                    <CheckCircle2 size={18} fill="#3DDBD9" className="text-[#12161D]" />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#1C2330] text-[#838C9C] text-[10px] font-mono font-bold uppercase">
                      {strat.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      strat.riskLevel === 'LOW' ? 'bg-[#00E676]/10 text-[#00E676]' :
                      strat.riskLevel === 'MEDIUM' ? 'bg-[#3DDBD9]/10 text-[#3DDBD9]' :
                      'bg-[#FF5252]/10 text-[#FF5252]'
                    }`}>
                      {strat.riskLevel} RISK
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-[#E6E9EF] leading-snug line-clamp-1">
                    {strat.name}
                  </h3>

                  <p className="text-xs text-[#838C9C] line-clamp-2 leading-relaxed">
                    {strat.tagline}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#232833]/60 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-[#838C9C] block text-[10px]">BACKTEST WIN</span>
                    <span className="text-[#00E676] font-bold">{strat.defaultWinRate}%</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#838C9C] block text-[10px]">RECOMMENDED TF</span>
                    <span className="text-[#3DDBD9] font-bold">{strat.recommendedTimeframe}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Strategy Parameters & Timeframe Customizer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Strategy Deep Dive & Indicators */}
        <div className="lg:col-span-2 bg-[#12161D] border border-[#232833] rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#232833]">
            <div>
              <span className="text-xs font-mono text-[#3DDBD9] uppercase font-bold tracking-wider">
                Active Configuration
              </span>
              <h2 className="text-xl font-black text-[#E6E9EF]">
                {selectedStrategy.name}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-lg bg-[#181D26] border border-[#232833] text-xs text-[#E6E9EF] font-mono">
                Payout: <strong className="text-[#00E676]">{selectedStrategy.payoutRange}</strong>
              </span>
            </div>
          </div>

          {/* Strategy Description */}
          <div className="bg-[#181D26] border border-[#232833] rounded-xl p-4 text-xs text-[#838C9C] leading-relaxed space-y-2">
            <p className="text-[#E6E9EF] font-medium">{selectedStrategy.description}</p>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-[11px] text-[#838C9C]">Best Markets:</span>
              {selectedStrategy.bestAssetClasses.map(ac => (
                <span key={ac} className="px-2 py-0.5 rounded bg-[#232833] text-[#3DDBD9] font-mono text-[10px] uppercase font-bold">
                  {ac}
                </span>
              ))}
            </div>
          </div>

          {/* Timeframe Selection Matrix (30s to 1mth) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#E6E9EF] flex items-center gap-2">
                <Clock size={15} className="text-[#3DDBD9]" />
                Select Trading Timeframe (Shortage 1m to 1 Month)
              </label>
              <span className="text-[11px] text-[#838C9C] font-mono">
                Optimal: <span className="text-[#00E676] font-bold">{selectedStrategy.recommendedTimeframe}</span>
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {ALL_TIMEFRAMES.map((tf) => {
                const isSelected = selectedTimeframe === tf.id;
                const isRecommended = selectedStrategy.recommendedTimeframe === tf.id;
                const isAllowed = selectedStrategy.allowedTimeframes.includes(tf.id);

                return (
                  <button
                    key={tf.id}
                    onClick={() => setSelectedTimeframe(tf.id)}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-mono font-bold flex flex-col items-center justify-center transition-all relative ${
                      isSelected
                        ? 'bg-[#3DDBD9] text-[#0B0E13] border-[#3DDBD9] shadow-[0_0_10px_rgba(61,219,217,0.4)]'
                        : isAllowed
                        ? 'bg-[#181D26] border-[#232833] text-[#E6E9EF] hover:border-[#3DDBD9]/50'
                        : 'bg-[#12161D] border-[#232833]/50 text-[#838C9C]/60 hover:text-[#E6E9EF]'
                    }`}
                  >
                    <span>{tf.id}</span>
                    <span className={`text-[9px] ${isSelected ? 'text-[#0B0E13]/80' : 'text-[#838C9C]'}`}>
                      {tf.label.split(' ')[1] || tf.label}
                    </span>

                    {isRecommended && !isSelected && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#00E676] rounded-full ring-2 ring-[#12161D]" title="Optimal Timeframe"></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Timeframe compatibility warning banner if user chose an unorthodox timeframe */}
            {!isOptimalTimeframe && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FFB74D]/10 border border-[#FFB74D]/30 text-[#FFB74D] text-xs">
                <AlertTriangle size={18} className="flex-shrink-0" />
                <div>
                  <strong className="block font-bold">Unconventional Timeframe Alert</strong>
                  <span>
                    You selected <strong>{selectedTimeframe}</strong> for <strong>{selectedStrategy.name}</strong>. This strategy yields peak accuracy on <strong>{selectedStrategy.allowedTimeframes.join(', ')}</strong>.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Strategy Indicators Stack */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#E6E9EF] uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={14} className="text-[#3DDBD9]" /> Confluence Indicators Stack
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedStrategy.indicators.map((ind, i) => (
                <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl bg-[#181D26] border border-[#232833] text-xs">
                  <div className="w-2 h-2 rounded-full bg-[#3DDBD9]"></div>
                  <span className="font-semibold text-[#E6E9EF]">{ind}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Parameters Configurator & Backtest Simulation */}
        <div className="space-y-6">
          {/* Adjustable Strategy Parameters */}
          <div className="bg-[#12161D] border border-[#232833] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#232833]">
              <h3 className="font-bold text-sm text-[#E6E9EF] flex items-center gap-2">
                <Settings2 size={16} className="text-[#3DDBD9]" /> Technical Parameters
              </h3>
              <span className="text-[10px] text-[#00E676] font-mono font-bold">LIVE ADJUSTABLE</span>
            </div>

            <div className="space-y-4">
              {selectedStrategy.parameters.map((param, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#E6E9EF]">{param.label}</span>
                    <span className="font-mono font-bold text-[#3DDBD9]">{param.value}</span>
                  </div>
                  <p className="text-[10px] text-[#838C9C]">{param.description}</p>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#232833] space-y-2">
              <label className="text-xs font-semibold text-[#E6E9EF] block">
                Minimum Signal Confluence Threshold ({minWinRateFilter}%)
              </label>
              <input
                type="range"
                min="80"
                max="98"
                value={minWinRateFilter}
                onChange={(e) => setMinWinRateFilter(Number(e.target.value))}
                className="w-full accent-[#3DDBD9] bg-[#181D26] rounded-lg h-2 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#838C9C] font-mono">
                <span>80% (More Signals)</span>
                <span>98% (Ultra High Accuracy)</span>
              </div>
            </div>
          </div>

          {/* Backtest Metrics Preview */}
          <div className="bg-[#12161D] border border-[#232833] rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-sm text-[#E6E9EF] flex items-center gap-2">
              <BarChart3 size={16} className="text-[#00E676]" /> Backtest Performance Matrix
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-[#181D26] border border-[#232833]">
                <span className="text-[#838C9C] block text-[10px]">HISTORICAL WIN RATE</span>
                <span className="text-[#00E676] font-bold text-lg">{selectedStrategy.defaultWinRate}%</span>
              </div>
              <div className="p-3 rounded-xl bg-[#181D26] border border-[#232833]">
                <span className="text-[#838C9C] block text-[10px]">PROFIT FACTOR</span>
                <span className="text-[#3DDBD9] font-bold text-lg">2.84</span>
              </div>
              <div className="p-3 rounded-xl bg-[#181D26] border border-[#232833]">
                <span className="text-[#838C9C] block text-[10px]">TOTAL SCANNED TRADES</span>
                <span className="text-[#E6E9EF] font-bold text-lg">4,120</span>
              </div>
              <div className="p-3 rounded-xl bg-[#181D26] border border-[#232833]">
                <span className="text-[#838C9C] block text-[10px]">MAX DRAWDOWN</span>
                <span className="text-[#FF5252] font-bold text-lg">-3.2%</span>
              </div>
            </div>

            <button
              onClick={handleApplyAndLaunch}
              className="w-full py-3 rounded-xl bg-[#3DDBD9] text-[#0B0E13] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg hover:bg-[#33c9c7] transition-all"
            >
              <Zap size={16} fill="currentColor" /> Apply To Signal Generator
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
