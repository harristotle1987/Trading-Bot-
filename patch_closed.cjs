const fs = require('fs');
let code = fs.readFileSync('src/components/ClosedTrades.tsx', 'utf8');

code = code.replace(
  'import React, { useState, useEffect } from "react";',
  'import React, { useState, useEffect } from "react";\nimport { useRealtimeData } from "../hooks/useRealtimeData";'
);

const oldHook = `  const [trades, setTrades] = useState<ClosedPosition[]>([]);

  const [isOpen, setIsOpen] = useState(false);

  const fetchClosedTrades = async () => {
    try {
      const res = await fetch("/api/trades/closed", { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(\`Failed to fetch: \${res.statusText}\`);
      }
      const data = await res.json();
      setTrades(data || []);
    } catch (err) {
      console.warn("Silent catch for network error during fetchClosedTrades:", err);
    }
  };

  useEffect(() => {
    fetchClosedTrades();
    const interval = setInterval(fetchClosedTrades, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);`;

const newHook = `  const { positions } = useRealtimeData();
  const trades = positions.filter(p => p.status === 'CLOSED') as ClosedPosition[];
  const [isOpen, setIsOpen] = useState(false);`;

code = code.replace(oldHook, newHook);
fs.writeFileSync('src/components/ClosedTrades.tsx', code);
