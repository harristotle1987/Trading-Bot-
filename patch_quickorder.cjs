const fs = require('fs');
let code = fs.readFileSync('src/components/QuickOrderPanel.tsx', 'utf8');

code = code.replace(
  'import React, { useState, useEffect } from "react";',
  'import React, { useState, useEffect } from "react";\nimport { useRealtimeData } from "../hooks/useRealtimeData";'
);

const oldPrepare = `    const prepareTrade = async (side: "BUY" | "SELL") => {
        const res = await fetch("/api/market/prices", { cache: 'no-store' });
        const prices = await res.json();
        const price = prices[activeSymbol] || 1;
        
        // Use AI suggested TP/SL or default to 2% / 1% if not provided
        const tp = aiAnalysis?.suggested_tp || (side === "BUY" ? price * 1.02 : price * 0.98);
        const sl = aiAnalysis?.suggested_sl || (side === "BUY" ? price * 0.99 : price * 1.01);
        
        setPendingTrade({ side, price, tp, sl, capital });
    };`;

const newPrepare = `    const { prices } = useRealtimeData();
    const prepareTrade = async (side: "BUY" | "SELL") => {
        const price = prices[activeSymbol] || 1;
        
        // Use AI suggested TP/SL or default to 2% / 1% if not provided
        const tp = aiAnalysis?.suggested_tp || (side === "BUY" ? price * 1.02 : price * 0.98);
        const sl = aiAnalysis?.suggested_sl || (side === "BUY" ? price * 0.99 : price * 1.01);
        
        setPendingTrade({ side, price, tp, sl, capital });
    };`;

code = code.replace(oldPrepare, newPrepare);
fs.writeFileSync('src/components/QuickOrderPanel.tsx', code);
