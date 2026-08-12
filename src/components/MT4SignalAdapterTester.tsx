import React, { useState } from 'react';
import { adaptCanonicalToMT4, CanonicalSignal, MT4Presentation } from '../utils/mt4Adapter';
import { AlertCircle, CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight, Target, ShieldAlert, Cpu } from 'lucide-react';

const TEST_CASES: { name: string; signal: CanonicalSignal }[] = [
  {
    name: 'Valid BUY',
    signal: { symbol: 'EURUSD', direction: 'BUY', entryPrice: 1.10500, stopLoss: 1.10000, takeProfit: 1.11500, timeframe: 'H1', signalScore: 85, mlProbability: 0.78, expectedValue: 0.025, marketRegime: 'TRENDING_UP' }
  },
  {
    name: 'Valid SELL',
    signal: { symbol: 'GBPUSD', direction: 'SELL', entryPrice: 1.25000, stopLoss: 1.25500, takeProfit: 1.24000, timeframe: 'M15', signalScore: 92, mlProbability: 0.82, expectedValue: 0.031, marketRegime: 'MEAN_REVERSION' }
  },
  {
    name: 'Invalid Direction',
    signal: { symbol: 'AUDJPY', direction: 'NO_TRADE', entryPrice: 95.500, stopLoss: 95.000, takeProfit: 96.000, timeframe: 'H4', signalScore: 50, mlProbability: 0.4, expectedValue: -0.01, marketRegime: 'RANGING' }
  },
  {
    name: 'Invalid BUY (SL > Entry)',
    signal: { symbol: 'XAUUSD', direction: 'BUY', entryPrice: 2000.00, stopLoss: 2010.00, takeProfit: 2050.00, timeframe: 'H1', signalScore: 70, mlProbability: 0.6, expectedValue: 0.05, marketRegime: 'VOLATILE' }
  },
  {
    name: 'Invalid SELL (TP > Entry)',
    signal: { symbol: 'USDJPY', direction: 'SELL', entryPrice: 150.00, stopLoss: 151.00, takeProfit: 152.00, timeframe: 'M5', signalScore: 88, mlProbability: 0.75, expectedValue: 0.02, marketRegime: 'TRENDING_DOWN' }
  },
  {
    name: 'Invalid Prices (Negative/Zero)',
    signal: { symbol: 'USDCAD', direction: 'BUY', entryPrice: 0, stopLoss: -1, takeProfit: 1.3, timeframe: 'D1', signalScore: 90, mlProbability: 0.8, expectedValue: 0.1, marketRegime: 'TRENDING_UP' }
  }
];

export default function MT4SignalAdapterTester() {
  const [activeTestIndex, setActiveTestIndex] = useState(0);

  const activeTest = TEST_CASES[activeTestIndex];
  const presentation: MT4Presentation = adaptCanonicalToMT4(activeTest.signal);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
      <div className="bg-[#12161D] border border-[#232833] rounded-2xl p-6">
        <h1 className="text-2xl font-extrabold text-[#E6E9EF] mb-2 flex items-center gap-2">
          <Cpu className="text-blue-400" />
          MT4/MT5 Signal Adapter (Test Harness)
        </h1>
        <p className="text-sm text-[#838C9C]">
          Transforms canonical signals into MT4/MT5 presentation formats. Validates directions and price logic without executing trades.
        </p>

        <div className="flex items-center gap-2 overflow-x-auto py-4 mt-4 scrollbar-none border-b border-[#232833]">
          {TEST_CASES.map((tc, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTestIndex(idx)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTestIndex === idx
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-[#181D26] text-[#838C9C] border border-[#232833] hover:bg-[#232833]'
              }`}
            >
              {tc.name}
            </button>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Canonical Input */}
          <div className="space-y-4">
            <h3 className="text-[#E6E9EF] font-bold border-b border-[#232833] pb-2">Canonical Signal (Input)</h3>
            <pre className="bg-[#0B0E13] p-4 rounded-xl text-[#3DDBD9] text-xs font-mono overflow-auto border border-[#232833]">
              {JSON.stringify(activeTest.signal, null, 2)}
            </pre>
          </div>

          {/* MT4 Presentation Output */}
          <div className="space-y-4">
            <h3 className="text-[#E6E9EF] font-bold border-b border-[#232833] pb-2">MT4/MT5 Presentation (Output)</h3>
            
            <div className={`p-5 rounded-2xl border ${presentation.isValid ? 'bg-[#00E676]/5 border-[#00E676]/30' : 'bg-[#FF5252]/5 border-[#FF5252]/30'}`}>
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-[#E6E9EF] tracking-wider">{presentation.symbol}</span>
                  <span className="px-2 py-0.5 bg-[#181D26] text-[#838C9C] text-[10px] font-bold rounded border border-[#232833]">
                    {presentation.timeframe}
                  </span>
                </div>
                
                {presentation.isValid ? (
                  <span className="px-3 py-1 rounded bg-[#00E676]/20 text-[#00E676] text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> VALID
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded bg-[#FF5252]/20 text-[#FF5252] text-xs font-bold flex items-center gap-1.5">
                    <XCircle size={14} /> INVALID
                  </span>
                )}
              </div>

              {!presentation.isValid && presentation.errorReason && (
                <div className="mb-4 p-3 rounded-lg bg-[#FF5252]/10 border border-[#FF5252]/20 flex items-start gap-2 text-[#FF5252] text-xs">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <p>{presentation.errorReason}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-[#838C9C] uppercase font-bold tracking-wider">Direction</p>
                  <p className={`font-mono font-black text-lg flex items-center gap-1 ${
                    presentation.direction === 'BUY' ? 'text-[#00E676]' : 
                    presentation.direction === 'SELL' ? 'text-[#FF5252]' : 'text-gray-400'
                  }`}>
                    {presentation.direction === 'BUY' && <ArrowUpRight size={18} />}
                    {presentation.direction === 'SELL' && <ArrowDownRight size={18} />}
                    {presentation.direction}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] text-[#838C9C] uppercase font-bold tracking-wider">Entry Price</p>
                  <p className="font-mono text-[#E6E9EF] font-bold">{presentation.entry}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] text-[#838C9C] uppercase font-bold tracking-wider flex items-center gap-1">
                    <ShieldAlert size={12}/> Stop/Invalidation
                  </p>
                  <p className="font-mono text-[#FF5252] font-bold">{presentation.stopInvalidation}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] text-[#838C9C] uppercase font-bold tracking-wider flex items-center gap-1">
                    <Target size={12}/> Target
                  </p>
                  <p className="font-mono text-[#3DDBD9] font-bold">{presentation.target}</p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-[#232833] grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-[#838C9C] uppercase font-bold tracking-wider">Signal Score</p>
                  <p className="font-mono text-[#E6E9EF] text-sm">{presentation.signalScore}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-[#838C9C] uppercase font-bold tracking-wider">ML Probability</p>
                  <p className="font-mono text-[#E6E9EF] text-sm">{presentation.mlProbability}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-[#838C9C] uppercase font-bold tracking-wider">Expected Value</p>
                  <p className={`font-mono text-sm ${presentation.expectedValue.startsWith('+') ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                    {presentation.expectedValue}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-[#838C9C] uppercase font-bold tracking-wider">Market Regime</p>
                  <p className="font-mono text-purple-400 text-sm">{presentation.marketRegime}</p>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
