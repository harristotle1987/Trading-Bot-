const fs = require('fs');
let code = fs.readFileSync('src/components/TradesManagementPage.tsx', 'utf-8');

if (!code.includes("import { mutate } from 'swr';")) {
    code = code.replace(`import React, { useState, useEffect } from "react";`, `import React, { useState, useEffect } from "react";\nimport { mutate } from 'swr';`);
}

let handleCloseCode = `  const handleClosePosition = async (id: string, mode: "DEMO" | "LIVE") => {
    console.log("Attempting to close position:", id, mode);
    try {
      // Optimistic mutate activeTrades to remove this position
      mutate('/api/trades/active', (current: any[]) => (current || []).filter(p => p.id !== id), false);

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
          toast.success(\`[\${mode}] Trade Closed! Realized PnL: $\${parseFloat(data.realized_pnl || 0).toFixed(2)}\`);
          mutate('/api/trades/active');
          mutate('/api/account/balances');
      } else {
          toast.error(\`Failed to close position: \${data.message || data.error}\`);
          mutate('/api/trades/active');
          mutate('/api/account/balances');
      }
    } catch (err: any) {
      toast.error(\`Failed to close position: \${err.message}\`);
      console.error("Failed to close position:", err);
      mutate('/api/trades/active');
      mutate('/api/account/balances');
    }
  };`;

code = code.replace(/const handleClosePosition = async \([\s\S]*?console\.error\("Failed to close position:", err\);\n    }\n  };/, handleCloseCode);

fs.writeFileSync('src/components/TradesManagementPage.tsx', code);
