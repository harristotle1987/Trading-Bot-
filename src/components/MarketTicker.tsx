import { useEffect } from "react";
import { TRADABLE_PAIRS } from "../App";
import { getPriceForSymbol, formatSmartPrice } from "../utils/priceUtils";
import { marketDataService } from "../lib/marketData";

export default function MarketTicker() {
  // Filter out redundant OTC duplicates for clean ticker display
  const tickerPairs = TRADABLE_PAIRS.filter((p, index, self) => 
    index === self.findIndex((t) => 
      t.symbol.replace(/[\/-]/g, '').replace(/\(OTC\)/gi, '').replace(/OTC/gi, '') ===
      p.symbol.replace(/[\/-]/g, '').replace(/\(OTC\)/gi, '').replace(/OTC/gi, '')
    )
  );

  const initialPrices = marketDataService.getPrices();

  const getDisplayPrice = (symbol: string) => {
    const val = getPriceForSymbol(initialPrices, symbol);
    if (typeof val === "number" && !isNaN(val) && val > 0) {
      return "$" + formatSmartPrice(val, symbol);
    }
    return "$1.00";
  };

  useEffect(() => {
    const unsubscribe = marketDataService.subscribe((latestPrices) => {
      tickerPairs.forEach((p) => {
        const val = getPriceForSymbol(latestPrices, p.symbol);
        const text = typeof val === "number" && !isNaN(val) && val > 0 
          ? "$" + formatSmartPrice(val, p.symbol) 
          : "$1.00";
        
        // Escape special chars in symbol for safe element ID selection
        const safeSymId = p.symbol.replace(/[^a-zA-Z0-9]/g, "_");
        const primaryEl = document.getElementById(`ticker-p-${safeSymId}`);
        const dupEl = document.getElementById(`ticker-d-${safeSymId}`);

        if (primaryEl && primaryEl.textContent !== text) {
          primaryEl.textContent = text;
        }
        if (dupEl && dupEl.textContent !== text) {
          dupEl.textContent = text;
        }
      });
    });

    return () => unsubscribe();
  }, [tickerPairs]);

  return (
    <div className="w-full bg-[#0B0E13] border-b border-[#232833] overflow-hidden flex items-center h-[30px] flex-shrink-0">
      <div className="flex animate-marquee whitespace-nowrap gap-8 px-4">
        {tickerPairs.map(p => {
          const safeSymId = p.symbol.replace(/[^a-zA-Z0-9]/g, "_");
          return (
            <div key={p.symbol} className="flex items-center gap-2 font-mono text-[10px]">
              <span className="text-[#3DDBD9] font-bold">{p.symbol.replace('-OTC', '')}</span>
              <span id={`ticker-p-${safeSymId}`} className="text-white font-semibold">
                {getDisplayPrice(p.symbol)}
              </span>
            </div>
          );
        })}
        {/* Duplicate for infinite marquee effect */}
        {tickerPairs.map(p => {
          const safeSymId = p.symbol.replace(/[^a-zA-Z0-9]/g, "_");
          return (
            <div key={p.symbol + "-dup"} className="flex items-center gap-2 font-mono text-[10px]">
              <span className="text-[#3DDBD9] font-bold">{p.symbol.replace('-OTC', '')}</span>
              <span id={`ticker-d-${safeSymId}`} className="text-white font-semibold">
                {getDisplayPrice(p.symbol)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
