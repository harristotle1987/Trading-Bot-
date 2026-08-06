import React from "react";
import { useRealtimeData } from "../hooks/useRealtimeData";
import { TRADABLE_PAIRS } from "../App";
import { formatPrice } from "../utils";

export default function MarketTicker() {
  const { prices } = useRealtimeData();

  const getDisplayPrice = (symbol: string) => {
    const val = prices[symbol];
    if (typeof val === "number" && !isNaN(val)) {
      return "$" + formatPrice(val);
    }
    return "$1.00";
  };

  return (
    <div className="w-full bg-[#0B0E13] border-b border-[#232833] overflow-hidden flex items-center h-[30px] flex-shrink-0">
      <div className="flex animate-marquee whitespace-nowrap gap-8 px-4">
        {TRADABLE_PAIRS.map(p => (
          <div key={p.symbol} className="flex items-center gap-2 font-mono text-[10px]">
            <span className="text-[#838C9C] font-bold">{p.symbol}</span>
            <span className="text-white font-semibold">
              {getDisplayPrice(p.symbol)}
            </span>
          </div>
        ))}
        {/* Duplicate for infinite marquee effect */}
        {TRADABLE_PAIRS.map(p => (
          <div key={p.symbol + "-dup"} className="flex items-center gap-2 font-mono text-[10px]">
            <span className="text-[#838C9C] font-bold">{p.symbol}</span>
            <span className="text-white font-semibold">
              {getDisplayPrice(p.symbol)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
