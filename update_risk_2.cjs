const fs = require('fs');

let code = fs.readFileSync('src/components/RiskSettings.tsx', 'utf-8');

if (!code.includes("import { mutate } from 'swr';")) {
    code = code.replace(`import React, { useState, useEffect } from 'react';`, `import React, { useState, useEffect } from 'react';\nimport { mutate } from 'swr';`);
}

code = code.replace(
    `const res = await fetch('/api/account/balance/reset', { method: 'POST' });
                  if (res.ok) {
                    setMessage('Balance reset to $10,000');
                    setTimeout(() => setMessage(''), 3000);
                  }`,
    `const res = await fetch('/api/account/balance/reset', { method: 'POST' });
                  if (res.ok) {
                    mutate('/api/account/balances');
                    setMessage('Balance reset to $10,000');
                    setTimeout(() => setMessage(''), 3000);
                  }`
);

fs.writeFileSync('src/components/RiskSettings.tsx', code);
