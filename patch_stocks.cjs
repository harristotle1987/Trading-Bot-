const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /\{ symbol: "CHFJPY", category: "forex", timeframes: \["1s", "1m", "5m", "15m", "1h"\] \}/;
const replacement = `{ symbol: "CHFJPY", category: "forex", timeframes: ["1s", "1m", "5m", "15m", "1h"] },
    // Stocks
    { symbol: "AAPL", category: "stocks", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "MSFT", category: "stocks", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "TSLA", category: "stocks", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "AMZN", category: "stocks", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "GOOGL", category: "stocks", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "NVDA", category: "stocks", timeframes: ["1m", "5m", "15m", "1h"] },
    { symbol: "META", category: "stocks", timeframes: ["1m", "5m", "15m", "1h"] }`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', code);
