import React, { useState, useEffect } from "react";
import { TRADABLE_PAIRS } from "../App";
import { formatPrice } from "../utils";

export default function MarketTicker() {
  const [prices, setPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch("/api/market/prices");
        if (res.ok) {
          const data = await res.json();
          setPrices(data);
        }
      } catch (err) {
        console.warn("Ticker fetch error", err);
      }
    };
    
    fetchPrices();
    const interval = setInterval(fetchPrices, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-[#0B0E13] border-b border-[#232833] overflow-hidden flex items-center h-[30px] flex-shrink-0">
      <div className="flex animate-marquee whitespace-nowrap gap-8 px-4">
        {TRADABLE_PAIRS.map(p => (
          <div key={p.symbol} className="flex items-center gap-2 font-mono text-[10px]">
            <span className="text-[#838C9C] font-bold">{p.symbol}</span>
            <span className={prices[p.symbol] ? "text-white" : "text-gray-600"}>
              {prices[p.symbol] ? "$" + formatPrice(prices[p.symbol]) : "---"}
            </span>
          </div>
        ))}
        {/* Duplicate for infinite marquee effect */}
        {TRADABLE_PAIRS.map(p => (
          <div key={p.symbol + "-dup"} className="flex items-center gap-2 font-mono text-[10px]">
            <span className="text-[#838C9C] font-bold">{p.symbol}</span>
            <span className={prices[p.symbol] ? "text-white" : "text-gray-600"}>
              {prices[p.symbol] ? "$" + formatPrice(prices[p.symbol]) : "---"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
