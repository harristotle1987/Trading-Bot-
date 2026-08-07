const fs = require('fs');

let code = fs.readFileSync('src/components/RiskSettings.tsx', 'utf-8');

code = code.replace(`import React, { useState, useEffect } from "react";`, `import React, { useState, useEffect } from "react";\nimport { mutate } from 'swr';\nimport { useAccountBalance } from "../hooks/useTradeState";`);

// Find handleResetAccount
let handleResetCode = `const handleResetAccount = async () => {
    try {
      const res = await fetch('/api/account/balance/reset', { method: 'POST' });
      if (res.ok) {
        toast.success("Account reset successfully");
        mutate('/api/account/balances');
        mutate('/api/trades/active');
      }
    } catch(err) {
      toast.error("Failed to reset account");
    }
  };`;

// RiskSettings probably fetches balance and displays it or something. Let's look at the file.
