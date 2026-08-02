const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const replacement = `
        // Fallback to Finnhub
        if (process.env.FINNHUB_API_KEY) {
            const finnhubRes = await fetch(\`https://finnhub.io/api/v1/quote?symbol=BINANCE:\${symbol}&token=\${process.env.FINNHUB_API_KEY}\`);
            if (finnhubRes.ok) {
                const data = await finnhubRes.json();
                if (data && data.c) {
                    return parseFloat(data.c);
                }
            }
        }
`;

code = code.replace(
    /        \/\/ Fallback to Bybit[\s\S]*?if \(list && list\.length > 0\) \{[\s\S]*?return parseFloat\(list\[0\]\.lastPrice\);[\s\S]*?\}[\s\S]*?\}/m,
    replacement.trim()
);

fs.writeFileSync('server.ts', code);
