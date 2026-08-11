export const DEFAULT_MARKET_PRICES: Record<string, number> = {
  // Crypto
  "BTCUSDT": 64250.00, "BTC": 64250.00, "BTC/USDT": 64250.00,
  "ETHUSDT": 1925.00, "ETH": 1925.00, "ETH/USDT": 1925.00,
  "SOLUSDT": 77.50, "SOL": 77.50, "SOL/USDT": 77.50,
  "XRPUSDT": 0.58, "XRP": 0.58, "XRP/USDT": 0.58,
  "BNBUSDT": 580.00, "BNB": 580.00, "BNB/USDT": 580.00,
  "ADAUSDT": 0.38, "ADA": 0.38, "ADA/USDT": 0.38,
  "DOGEUSDT": 0.12, "DOGE": 0.12, "DOGE/USDT": 0.12,
  "AVAXUSDT": 26.50, "AVAX": 26.50, "AVAX/USDT": 26.50,
  "LINKUSDT": 14.20, "LINK": 14.20, "LINK/USDT": 14.20,
  "DOTUSDT": 6.80, "DOT": 6.80, "DOT/USDT": 6.80,
  "NEARUSDT": 5.10, "NEAR": 5.10, "NEAR/USDT": 5.10,
  "SUIUSDT": 1.85, "SUI": 1.85, "SUI/USDT": 1.85,
  "APTUSDT": 8.40, "APT": 8.40, "APT/USDT": 8.40,
  "MATICUSDT": 0.52, "MATIC": 0.52, "MATIC/USDT": 0.52,
  "LTCUSDT": 72.00, "LTC": 72.00, "LTC/USDT": 72.00,
  "UNIUSDT": 7.80, "UNI": 7.80, "UNI/USDT": 7.80,
  "ATOMUSDT": 6.20, "ATOM": 6.20, "ATOM/USDT": 6.20,
  "ETCUSDT": 21.00, "ETC": 21.00, "ETC/USDT": 21.00,
  "FILUSDT": 4.80, "FIL": 4.80, "FIL/USDT": 4.80,
  "ARBUSDT": 0.62, "ARB": 0.62, "ARB/USDT": 0.62,
  "PEPEUSDT": 0.0000085, "PEPE": 0.0000085,
  "SHIBUSDT": 0.0000175, "SHIB": 0.0000175,
  "INJUSDT": 21.50, "INJ": 21.50,
  "RNDRUSDT": 6.40, "RNDR": 6.40,
  "OPUSDT": 1.65, "OP": 1.65,
  "TIAUSDT": 5.80, "TIA": 5.80,
  "AAVEUSDT": 115.00, "AAVE": 115.00,
  "FETUSDT": 1.35, "FET": 1.35,
  "WIFUSDT": 1.85, "WIF": 1.85,
  // Forex
  "EURUSD": 1.1548, "EUR/USD": 1.1548,
  "GBPUSD": 1.3506, "GBP/USD": 1.3506,
  "USDJPY": 158.95, "USD/JPY": 158.95,
  "AUDUSD": 0.7059, "AUD/USD": 0.7059,
  "USDCAD": 1.3939, "USD/CAD": 1.3939,
  "USDCHF": 0.8095, "USD/CHF": 0.8095,
  "NZDUSD": 0.5886, "NZD/USD": 0.5886,
  "EURGBP": 0.8550, "EUR/GBP": 0.8550,
  "EURJPY": 183.56, "EUR/JPY": 183.56,
  "GBPJPY": 214.68, "GBP/JPY": 214.68,
  "AUDJPY": 112.20, "AUD/JPY": 112.20,
  "EURAUD": 1.6360, "EUR/AUD": 1.6360,
  "GBPCAD": 1.8820, "GBP/CAD": 1.8820,
  "CADJPY": 114.00, "CAD/JPY": 114.00,
  "CHFJPY": 196.35, "CHF/JPY": 196.35,
  "EURNZD": 1.8210, "EUR/NZD": 1.8210,
  "GBPAUD": 1.9512, "GBP/AUD": 1.9512,
  // Commodities & Metals
  "XAUUSD": 2420.50, "XAU/USD": 2420.50, "XAU/USD (Gold)": 2420.50,
  "XAGUSD": 28.40, "XAG/USD": 28.40,
  "USOIL": 76.50, "USOIL (WTI)": 76.50,
  // Stocks
  "AAPL": 224.50, "AAPL (Stock)": 224.50,
  "MSFT": 448.20, "MSFT (Stock)": 448.20,
  "TSLA": 218.40, "TSLA (Stock)": 218.40,
  "AMZN": 182.60, "AMZN (Stock)": 182.60,
  "GOOGL": 172.80, "GOOGL (Stock)": 172.80,
  "NVDA": 128.50, "NVDA (Stock)": 128.50,
  "META": 485.00, "META (Stock)": 485.00,
  "AMD": 135.20, "AMD (Stock)": 135.20,
  "NFLX": 640.00, "NFLX (Stock)": 640.00,
  "PLTR": 28.50, "PLTR (Stock)": 28.50,
  "COIN": 215.00, "COIN (Stock)": 215.00
};

export function getPriceForSymbol(prices: Record<string, number> | undefined, rawSymbol: string): number {
  if (!rawSymbol) return 100;
  
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

  // 3. Fallback from DEFAULT_MARKET_PRICES
  if (DEFAULT_MARKET_PRICES[rawSymbol]) return DEFAULT_MARKET_PRICES[rawSymbol];
  if (DEFAULT_MARKET_PRICES[clean]) return DEFAULT_MARKET_PRICES[clean];
  if (DEFAULT_MARKET_PRICES[`${clean}USDT`]) return DEFAULT_MARKET_PRICES[`${clean}USDT`];

  // 4. Default intelligent price category estimation
  if (clean.includes('BTC')) return 64250;
  if (clean.includes('ETH')) return 1925;
  if (clean.includes('SOL')) return 77.5;
  if (clean.includes('XAU') || clean.includes('GOLD')) return 2420.5;
  if (clean.includes('NVDA')) return 128.5;
  if (clean.includes('AAPL')) return 224.5;
  if (clean.includes('JPY')) return 154.2;
  if (clean.length === 6 && !clean.includes('USDT')) return 1.1548;

  return 100;
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
