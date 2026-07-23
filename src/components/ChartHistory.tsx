"use client";
import React, { useState, useEffect } from 'react';

export default function ChartHistory() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto h-full font-mono text-[#E6E9EF]">
      <div className="flex items-center justify-between bg-[#0B0C10] p-6 rounded-lg border-[4px] border-[#1F2833] shadow-2xl">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-widest uppercase mb-1 flex items-center gap-3">
            <svg className="w-6 h-6 text-[#3DDBD9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
            Snapshot Dashboard
          </h2>
          <span className="text-sm font-semibold text-[#838C9C] uppercase">Account Performance Metrics</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#0B0C10] p-6 rounded-lg border-[4px] border-[#1F2833] shadow-2xl">
              <h3 className="text-xs uppercase tracking-widest text-[#838C9C] mb-4 font-bold border-b-2 border-[#1F2833] pb-2">Win / Loss Ratio</h3>
              <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold text-[#00E676]">68%</span>
                  <span className="text-sm text-[#838C9C] mb-1">Win Rate</span>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                  <div className="flex justify-between text-xs font-bold text-[#E6E9EF]">
                      <span>Wins: 142</span>
                      <span>Losses: 67</span>
                  </div>
                  <div className="w-full bg-[#FF1744] h-2 rounded flex">
                      <div className="bg-[#00E676] h-full rounded-l" style={{width: '68%'}}></div>
                  </div>
              </div>
          </div>
          
          <div className="bg-[#0B0C10] p-6 rounded-lg border-[4px] border-[#1F2833] shadow-2xl">
              <h3 className="text-xs uppercase tracking-widest text-[#838C9C] mb-4 font-bold border-b-2 border-[#1F2833] pb-2">Max Drawdown</h3>
              <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold text-[#FF1744]">-12.4%</span>
                  <span className="text-sm text-[#838C9C] mb-1">Peak-to-Trough</span>
              </div>
              <p className="mt-4 text-xs text-[#838C9C]">
                  Highest equity peak was $14,250 on 2026-06-15. Current equity indicates healthy recovery phases.
              </p>
          </div>
          
          <div className="bg-[#0B0C10] p-6 rounded-lg border-[4px] border-[#1F2833] shadow-2xl">
              <h3 className="text-xs uppercase tracking-widest text-[#838C9C] mb-4 font-bold border-b-2 border-[#1F2833] pb-2">Portfolio Distribution</h3>
              <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm font-bold">
                      <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#3DDBD9]"></div>
                          <span>Crypto (Spot)</span>
                      </div>
                      <span>65%</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold">
                      <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#FFD600]"></div>
                          <span>Forex (Margin)</span>
                      </div>
                      <span>25%</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold">
                      <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#00E676]"></div>
                          <span>Stablecoins</span>
                      </div>
                      <span>10%</span>
                  </div>
              </div>
          </div>
      </div>
      
      <div className="bg-[#0B0C10] p-6 rounded-lg border-[4px] border-[#1F2833] shadow-2xl flex-1 flex flex-col min-h-[300px]">
          <h3 className="text-xs uppercase tracking-widest text-[#838C9C] mb-4 font-bold border-b-2 border-[#1F2833] pb-2">Account Equity Growth Curve</h3>
          <div className="flex-1 border-2 border-dashed border-[#1F2833] rounded flex items-center justify-center text-[#838C9C] relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-t from-[#3DDBD9]/10 to-transparent opacity-50"></div>
              {/* Fake chart visualization */}
              <svg className="w-full h-full opacity-50" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <path d="M0 100 L 10 95 L 20 80 L 30 85 L 40 60 L 50 65 L 60 40 L 70 30 L 80 45 L 90 20 L 100 10" fill="none" stroke="#3DDBD9" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                  <path d="M0 100 L 10 95 L 20 80 L 30 85 L 40 60 L 50 65 L 60 40 L 70 30 L 80 45 L 90 20 L 100 10 L 100 100 Z" fill="#3DDBD9" fillOpacity="0.1" stroke="none" />
              </svg>
          </div>
      </div>
    </div>
  );
}
