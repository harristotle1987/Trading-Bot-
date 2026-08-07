const fs = require('fs');
let code = fs.readFileSync('src/components/AgentInsightPanel.tsx', 'utf-8');

// 1. Import mutate from swr
if (!code.includes("import { mutate } from 'swr';")) {
    code = code.replace("import React,", "import { mutate } from 'swr';\nimport React,");
}

// 2. update handleExecuteSignal to optimistic mutate
let newHandleExecute = `  const handleExecuteSignal = async (s: TradeSignal) => {
    setExecutingSymbol(s.symbol);
    try {
      const livePrice = prices[s.symbol] || s.entryPrice || 100;
      
      // Optimistic mutation
      const optimisticPosition = {
        id: Math.random().toString(),
        symbol: s.symbol,
        side: s.type === "UP" ? "BUY" : "SELL",
        status: 'OPEN',
        entry_price: livePrice,
        unrealized_pnl: 0,
        margin_allocated: allocation,
        leverage: leverage,
        take_profit: s.tpPrice,
        stop_loss: s.slPrice,
        account_mode: "DEMO"
      };

      mutate('/api/trades/active', (currentData: any = []) => [...currentData, optimisticPosition], false);
      mutate('/api/account/balances', (currentData: any) => {
        if (!currentData || !currentData.demo) return currentData;
        return {
            ...currentData,
            demo: {
                ...currentData.demo,
                available_balance: currentData.demo.available_balance - allocation
            }
        };
      }, false);

      const res = await fetch("/api/trades/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: s.symbol,
          side: s.type === "UP" ? "BUY" : "SELL",
          capital: allocation,
          leverage: leverage,
          execution_price: livePrice,
          use_market_price: true,
          tp: s.tpPrice,
          sl: s.slPrice,
          account_mode: "DEMO"
        })
      });
      if (res.ok) {
        toast.success(\`Trade Executed for \${s.symbol} at live market price ($\${livePrice})!\`);
        // Invalidate to fetch real data
        mutate('/api/trades/active');
        mutate('/api/account/balances');
      } else {
        const data = await res.json();
        toast.error(\`Trade failed: \${data.error || data.message}\`);
        // Rollback
        mutate('/api/trades/active');
        mutate('/api/account/balances');
      }
    } catch(err: any) {
      toast.error(\`Execution error: \${err.message}\`);
      mutate('/api/trades/active');
      mutate('/api/account/balances');
    } finally {
      setExecutingSymbol(null);
    }
  };`;

code = code.replace(/const handleExecuteSignal = async \(s: TradeSignal\) => {[\s\S]*?setExecutingSymbol\(null\);\n    }\n  };/, newHandleExecute);

fs.writeFileSync('src/components/AgentInsightPanel.tsx', code);
