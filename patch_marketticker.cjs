const fs = require('fs');
let code = fs.readFileSync('src/components/MarketTicker.tsx', 'utf8');

code = code.replace(
  'import React, { useState, useEffect } from "react";',
  'import React, { useState, useEffect } from "react";\nimport { useRealtimeData } from "../hooks/useRealtimeData";'
);

const oldHook = `  const [prices, setPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch("/api/market/prices", { cache: 'no-store' });
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
  }, []);`;

const newHook = `  const { prices } = useRealtimeData();`;

code = code.replace(oldHook, newHook);
fs.writeFileSync('src/components/MarketTicker.tsx', code);
