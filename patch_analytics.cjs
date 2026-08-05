const fs = require('fs');
let code = fs.readFileSync('src/components/AnalyticsDashboard.tsx', 'utf8');

code = code.replace(
  'import React, { useState, useEffect } from "react";',
  'import React, { useState, useEffect } from "react";\nimport { useRealtimeData } from "../hooks/useRealtimeData";'
);

const oldHook = `  const [activeTrades, setActiveTrades] = useState<any[]>([]);
  const [closedTrades, setClosedTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const [activeRes, closedRes] = await Promise.all([
          fetch("/api/trades/active", { cache: 'no-store' }),
          fetch("/api/trades/closed", { cache: 'no-store' })
        ]);
        if (activeRes.ok) setActiveTrades(await activeRes.json());
        if (closedRes.ok) setClosedTrades(await closedRes.json());
      } catch (err) {
        console.error("Failed to fetch trades for analytics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrades();
  }, []);`;

const newHook = `  const { positions } = useRealtimeData();
  const activeTrades = positions.filter(p => p.status === 'OPEN');
  const closedTrades = positions.filter(p => p.status === 'CLOSED');
  const loading = false;`;

code = code.replace(oldHook, newHook);
fs.writeFileSync('src/components/AnalyticsDashboard.tsx', code);
