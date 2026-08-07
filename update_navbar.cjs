const fs = require('fs');

let code = fs.readFileSync('src/components/TopNavbar.tsx', 'utf-8');
code = code.replace(`import React, { useState, useEffect } from "react";`, `import React, { useState, useEffect } from "react";\nimport { useAccountBalance } from "../hooks/useTradeState";`);

code = code.replace(/const \[balances, setBalances\] = useState<{[\s\S]*?}\);/m, `const { balances } = useAccountBalance();`);

code = code.replace(/const fetchBalances = async \(\) => {[\s\S]*?};/m, '');

// update useEffect to remove fetchBalances
code = code.replace(/fetchBalances\(\);\n/g, '');

fs.writeFileSync('src/components/TopNavbar.tsx', code);
