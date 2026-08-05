const fs = require('fs');
let code = fs.readFileSync('src/components/InteractiveChartsWorkspace.tsx', 'utf8');

code = code.replace(
  'import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";',
  'import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";\nimport { useRealtimeData } from "../hooks/useRealtimeData";'
);

const oldFetchMethods = `  const fetchActiveTrades = async () => {
      try {
          const res = await fetch("/api/trades/active", { cache: 'no-store' });
      if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
      const data = await res.json();
          if (res.ok) {
              setActiveTrades(data || []);
          }
      } catch (err) {
          // Silent catch for network errors during dev server restarts
      }
  };

  const fetchClosedTrades = async () => {
      try {
          const res = await fetch("/api/trades/closed", { cache: 'no-store' });
      if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
      const data = await res.json();
          if (res.ok) {
              setClosedTrades(data || []);
          }
      } catch (err) {
          // Silent catch for network errors during dev server restarts
      }
  };

  useEffect(() => {
    fetchBalances();
    fetchActiveTrades();
    fetchClosedTrades();
    const interval = setInterval(() => {
        fetchActiveTrades();
        fetchClosedTrades();
    }, 5000);
    return () => clearInterval(interval);
  }, []);`;

const newFetchMethods = `  const { positions } = useRealtimeData();

  useEffect(() => {
      const active = positions.filter(p => p.status === 'OPEN');
      const closed = positions.filter(p => p.status === 'CLOSED');
      setActiveTrades(active);
      setClosedTrades(closed);
  }, [positions]);

  useEffect(() => {
    fetchBalances();
  }, []);`;

code = code.replace(oldFetchMethods, newFetchMethods);
fs.writeFileSync('src/components/InteractiveChartsWorkspace.tsx', code);
