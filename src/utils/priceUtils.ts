export const DEFAULT_MARKET_PRICES: Record<string, number> = {};

export function getPriceForSymbol(prices: Record<string, number> | undefined, rawSymbol: string): number {
  if (!rawSymbol) return 0;
  
  // 1. Direct match in provided prices
  if (prices && prices[rawSymbol] && prices[rawSymbol] > 0) {
    return prices[rawSymbol];
  }

  // 2. Clean symbol permutations
  const clean = rawSymbol.replace(/[\/-]/g, '').replace(/\(OTC\)/gi, '').replace(/\(Stock\)/gi, '').replace(/OTC/gi, '').trim().toUpperCase();

  if (prices) {
    if (prices[clean] && prices[clean] > 0) return prices[clean];
    if (prices[`${clean}USDT`] && prices[`${clean}USDT`] > 0) return prices[`${clean}USDT`];
    
    // Check if stripped from USDT
    if (clean.endsWith('USDT')) {
      const base = clean.replace('USDT', '');
      if (prices[base] && prices[base] > 0) return prices[base];
    }
  }

  return 0;
}

export function formatSmartPrice(price: number, symbol?: string): string {
  if (price === undefined || price === null || isNaN(price)) return '0.00';
  
  const symUpper = symbol ? symbol.toUpperCase() : '';
  const isForex = (symUpper.includes('EUR') || symUpper.includes('GBP') || symUpper.includes('AUD') || symUpper.includes('CAD') || symUpper.includes('CHF') || symUpper.includes('NZD') || symUpper.includes('USD')) && !symUpper.includes('USDT') && !symUpper.includes('BTC') && !symUpper.includes('ETH') && !symUpper.includes('SOL');
  
  if (isForex && !symUpper.includes('JPY')) {
    return price.toFixed(5);
  }
  if (isForex && symUpper.includes('JPY')) {
    return price.toFixed(3);
  }
  if (price < 0.001) {
    return price.toFixed(8);
  }
  if (price < 1) {
    return price.toFixed(4);
  }
  if (price < 10) {
    return price.toFixed(3);
  }
  return price.toFixed(2);
}
