const fs = require('fs');

let content = fs.readFileSync('src/components/InteractiveChartsWorkspace.tsx', 'utf8');

const replacement = `
        const isForex = TRADABLE_PAIRS.find((p: any) => p.symbol === selectedSymbol)?.category === 'forex';
        const categoryParam = isForex ? 'linear' : 'spot';
        
        const cacheKey = \`market_data_\${selectedSymbol}_\${intervalParams}\`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            try {
                const { timestamp, data } = JSON.parse(cached);
                // Use cache if it's less than 60 seconds old
                if (Date.now() - timestamp < 60000) {
                    if (isMounted && data.length > 0) {
                        candlestickSeriesInstance.setData(data);
                    }
                    return;
                }
            } catch (e) {
                // Ignore parse error
            }
        }

        const bybitRes = await fetch(\`/api/bybit/v5/market/kline?category=\${categoryParam}&symbol=\${selectedSymbol}&interval=\${intervalParams}&limit=500\`);
        if (!bybitRes.ok) throw new Error(\`HTTP \${bybitRes.status}\`);
        const bybitData = await bybitRes.json();
        if (bybitData.retCode === 0 && bybitData.result?.list) {
          formattedData = bybitData.result.list.map((item: any) => ({
            time: Math.floor(parseInt(item[0]) / 1000),
            open: parseFloat(item[1]),
            high: parseFloat(item[2]),
            low: parseFloat(item[3]),
            close: parseFloat(item[4]),
          }));
        }
        
        // Ensure data is sorted by time ascending (lightweight-charts requirement)
        formattedData.sort((a: any, b: any) => a.time - b.time);
        
        sessionStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: formattedData }));
`;

content = content.replace(
/        const isForex = TRADABLE_PAIRS\.find\(\(p: any\) => p\.symbol === selectedSymbol\)\?\.category === 'forex';[\s\S]*?        formattedData\.sort\(\(a: any, b: any\) => a\.time - b\.time\);/g,
replacement.trim()
);

fs.writeFileSync('src/components/InteractiveChartsWorkspace.tsx', content);
