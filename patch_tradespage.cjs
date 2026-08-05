const fs = require('fs');
let code = fs.readFileSync('src/components/TradesManagementPage.tsx', 'utf8');

code = code.replace(
  'import React, { useState, useEffect } from "react";',
  'import React, { useState, useEffect } from "react";\nimport { useRealtimeData } from "../hooks/useRealtimeData";'
);

const oldUseEffect = `  const fetchPositions = async () => {
    try {
      const res = await fetch("/api/trades/active", { cache: 'no-store' });
      if (!res.ok) {
        console.warn("API Error:", res.status, await res.text());
        return;
      }
      const data = await res.json();
      setPositions(data || []);
    } catch (err) {
      console.warn("Error fetching trades:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClosePosition = async (id: string, mode: "DEMO" | "LIVE") => {
    console.log("Attempting to close position:", id, mode);
    try {
      const res = await fetch("/api/trades/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            position_id: id, 
            account_mode: mode,
            exit_price: positions.find(p => p.id === id)?.current_mark_price || 0
        }),
      });
      console.log("Close response status:", res.status);
      const data = await res.json();
      console.log("Close response data:", data);
      if (res.ok) {
          toast.success(\`[\${mode}] Trade Closed! Realized PnL: $\${data.realized_pnl}\`);
          await fetchPositions(); // Refresh trades list instantly
          window.dispatchEvent(new Event("balance_updated"));
      } else {
          toast.error(\`Failed to close position: \${data.message || data.error}\`);
      }
    } catch (err: any) {
      toast.error(\`Failed to close position: \${err.message}\`);
      console.error("Failed to close position:", err);
    }
  };

  useEffect(() => {
    let unsubscribe = () => {};
    try {
        const tradesRef = doc(db, "system", "trades");
        unsubscribe = onSnapshot(tradesRef, (docSnap) => {
            if (docSnap.exists()) {
                // We'll also poll continuously so price/PnL updates show up
            }
            setIsLoading(false);
        });
    } catch (err) {
        console.error("Firebase sync error:", err);
    }
    
    // Always poll to get real-time price & PnL updates from server since Firebase is only updated on close
    fetchPositions();
    const interval = setInterval(fetchPositions, 2000);
    
    const oldUnsubscribe = unsubscribe;
    unsubscribe = () => {
        oldUnsubscribe();
        clearInterval(interval);
    };
    
    return () => unsubscribe();
  }, []);`;

const newUseEffect = `  const { positions: globalPositions } = useRealtimeData();

  useEffect(() => {
      setPositions(globalPositions.filter(p => p.status === 'OPEN'));
      setIsLoading(false);
  }, [globalPositions]);

  const handleClosePosition = async (id: string, mode: "DEMO" | "LIVE") => {
    console.log("Attempting to close position:", id, mode);
    try {
      const res = await fetch("/api/trades/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            position_id: id, 
            account_mode: mode,
            exit_price: positions.find(p => p.id === id)?.current_mark_price || 0
        }),
      });
      console.log("Close response status:", res.status);
      const data = await res.json();
      console.log("Close response data:", data);
      if (res.ok) {
          toast.success(\`[\${mode}] Trade Closed! Realized PnL: $\${data.realized_pnl}\`);
          window.dispatchEvent(new Event("balance_updated"));
      } else {
          toast.error(\`Failed to close position: \${data.message || data.error}\`);
      }
    } catch (err: any) {
      toast.error(\`Failed to close position: \${err.message}\`);
      console.error("Failed to close position:", err);
    }
  };`;

code = code.replace(oldUseEffect, newUseEffect);

fs.writeFileSync('src/components/TradesManagementPage.tsx', code);
