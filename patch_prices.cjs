const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Patch getCurrentMarketPrice
const targetGetCurrentPrice = `  async function getCurrentMarketPrice(symbol: string): Promise<number | null> {
    try {
        const binanceRes = await fetch(\`https://api.binance.com/api/v3/ticker/price?symbol=\${symbol}\`);
        if (binanceRes.ok) {
            const data = await binanceRes.json();
            return parseFloat(data.price);
        }
        // Fallback to Bybit
        const bybitRes = await fetch(\`https://api.bybit.com/v5/market/tickers?category=linear&symbol=\${symbol}\`);
        if (bybitRes.ok) {
            const bybitData = await bybitRes.json();
            const lastPrice = bybitData.result?.list?.[0]?.lastPrice;
            if (lastPrice) return parseFloat(lastPrice);
        }
    } catch (e) { }
    return null;
  }`;

const replacementGetCurrentPrice = `  async function getCurrentMarketPrice(symbol: string): Promise<number | null> {
    if (GLOBAL_PRICES[symbol]) return GLOBAL_PRICES[symbol];
    try {
        const binanceRes = await fetch(\`https://api.binance.com/api/v3/ticker/price?symbol=\${symbol}\`);
        if (binanceRes.ok) {
            const data = await binanceRes.json();
            return parseFloat(data.price);
        }
        // Fallback to Bybit
        const bybitRes = await fetch(\`https://api.bybit.com/v5/market/tickers?category=linear&symbol=\${symbol}\`);
        if (bybitRes.ok) {
            const bybitData = await bybitRes.json();
            const lastPrice = bybitData.result?.list?.[0]?.lastPrice;
            if (lastPrice) return parseFloat(lastPrice);
        }
    } catch (e) { }
    return null;
  }`;
code = code.replace(targetGetCurrentPrice, replacementGetCurrentPrice);

// Patch managePositionsEngine
const targetManagePositions = `  const managePositionsEngine = async () => {
      try {
          const binanceRes = await fetch("https://api.binance.com/api/v3/ticker/price");
          if (!binanceRes.ok) return;
          const pricesData = await binanceRes.json();
          const priceMap: Record<string, number> = {};
          pricesData.forEach((item: any) => {
              priceMap[item.symbol] = parseFloat(item.price);
          });

          GLOBAL_POSITIONS.forEach(pos => {
              if (pos.status === "OPEN") {
                  const currentPrice = priceMap[pos.symbol];
                  if (currentPrice) {`;

const replacementManagePositions = `  const managePositionsEngine = async () => {
      try {
          // Use GLOBAL_PRICES directly so forex and crypto are supported identically
          const priceMap = GLOBAL_PRICES;

          GLOBAL_POSITIONS.forEach(pos => {
              if (pos.status === "OPEN") {
                  let currentPrice = priceMap[pos.symbol];
                  
                  // if not in global prices, we might need a fallback, but updatePrices should have it
                  if (currentPrice) {`;
code = code.replace(targetManagePositions, replacementManagePositions);

fs.writeFileSync('server.ts', code);
