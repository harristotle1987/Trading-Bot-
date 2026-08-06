export type AssetCategory = 'crypto' | 'forex' | 'stocks' | 'commodities';

export interface PositionCalculation {
    contractSize: number; // For crypto: quantity of coin. For forex: standard lots.
    contractSizeStr: string;
    pipValue: number; // Value per pip (or per dollar for crypto)
    maxRiskAtSL: number;
    maxGainAtTP: number;
}

export function calculatePositionTrajectory(
    allocationUsd: number,
    leverage: number,
    entryPrice: number,
    slPrice: number,
    tpPrice: number,
    category: AssetCategory
): PositionCalculation {
    let contractSize = 0;
    let contractSizeStr = '';
    let pipValue = 0;
    let maxRiskAtSL = 0;
    let maxGainAtTP = 0;

    const notionalValue = allocationUsd * leverage;

    if (category === 'crypto' || category === 'stocks') {
        // Crypto / Stocks Logic
        contractSize = notionalValue / entryPrice;
        contractSizeStr = `${contractSize.toFixed(4)}`;
        
        pipValue = contractSize; 
        
        maxRiskAtSL = Math.abs(entryPrice - slPrice) * contractSize;
        maxGainAtTP = Math.abs(tpPrice - entryPrice) * contractSize;
    } else if (category === 'forex' || category === 'commodities') {
        // Forex / Commodities Logic (Pip Value Engine)
        const standardLotUnits = category === 'commodities' ? 100 : 100000;
        
        contractSize = notionalValue / standardLotUnits;
        contractSizeStr = `${contractSize.toFixed(2)} Lots`;
        
        const pipSize = category === 'commodities' ? 0.1 : (entryPrice > 50 ? 0.01 : 0.0001); 
        
        pipValue = contractSize * standardLotUnits * pipSize;
        
        const slPips = Math.abs(entryPrice - slPrice) / pipSize;
        const tpPips = Math.abs(tpPrice - entryPrice) / pipSize;
        
        maxRiskAtSL = slPips * pipValue;
        maxGainAtTP = tpPips * pipValue;
    }

    return {
        contractSize,
        contractSizeStr,
        pipValue,
        maxRiskAtSL,
        maxGainAtTP
    };
}

export interface MarketPnLResult {
    pnl: number;
    pnlPct: number;
    pipsMoved: number;
    pipValue: number;
    pipSize: number;
    category: AssetCategory;
    units: number;
    lots?: number;
}

export function calculateMarketPnL(params: {
    symbol: string;
    side: string; // 'BUY' | 'SELL' | 'LONG' | 'SHORT'
    entryPrice: number;
    currentPrice: number;
    quantity?: number; // units, coins, shares or lots
    capital?: number; // margin used ($)
    leverage?: number; // e.g. 1, 10, 20, 50, 100
}): MarketPnLResult {
    const { symbol, side, entryPrice, currentPrice, quantity, capital, leverage = 10 } = params;

    if (!entryPrice || entryPrice <= 0 || !currentPrice || currentPrice <= 0) {
        return { pnl: 0, pnlPct: 0, pipsMoved: 0, pipValue: 0, pipSize: 0.0001, category: 'crypto', units: 0 };
    }

    const isLong = side.toUpperCase() === 'BUY' || side.toUpperCase() === 'LONG';
    const symUpper = symbol.toUpperCase();

    // Determine category and pip size
    let category: AssetCategory = 'crypto';
    let pipSize = 0.0001;

    const isForex = (symUpper.includes('USD') || symUpper.includes('EUR') || symUpper.includes('GBP') || symUpper.includes('JPY') || symUpper.includes('AUD') || symUpper.includes('CAD') || symUpper.includes('CHF') || symUpper.includes('NZD')) && !symUpper.includes('USDT') && !symUpper.includes('BTC') && !symUpper.includes('ETH') && !symUpper.includes('SOL');
    const isGold = symUpper.includes('XAU') || symUpper.includes('GOLD');
    const isOil = symUpper.includes('OIL') || symUpper.includes('WTI') || symUpper.includes('BRENT');
    const isStock = symUpper === 'TSLA' || symUpper === 'AAPL' || symUpper === 'NVDA' || symUpper === 'MSFT' || symUpper === 'AMZN' || symUpper === 'GOOGL' || symUpper === 'META';

    if (isForex) {
        category = 'forex';
        pipSize = symUpper.includes('JPY') ? 0.01 : 0.0001;
    } else if (isGold || isOil) {
        category = 'commodities';
        pipSize = isGold ? 0.1 : 0.01;
    } else if (isStock) {
        category = 'stocks';
        pipSize = 0.01;
    } else {
        category = 'crypto';
        pipSize = currentPrice > 1000 ? 1.0 : (currentPrice > 10 ? 0.1 : 0.01);
    }

    // Determine effective traded units
    let units = 0;
    let effectiveCapital = capital || 0;

    if (quantity && quantity > 0) {
        if (category === 'forex' && quantity <= 100) {
            // Quantity was provided as Standard Lots (e.g. 0.1 lots = 10,000 units)
            units = quantity * 100000;
        } else {
            units = quantity;
        }
        if (!effectiveCapital) {
            effectiveCapital = (units * entryPrice) / leverage;
        }
    } else if (effectiveCapital > 0) {
        const notional = effectiveCapital * leverage;
        units = notional / entryPrice;
    } else {
        // Fallback default
        effectiveCapital = 100;
        const notional = effectiveCapital * leverage;
        units = notional / entryPrice;
    }

    // Price difference and Pips moved
    const priceDiffRaw = isLong ? (currentPrice - entryPrice) : (entryPrice - currentPrice);
    const pipsMoved = priceDiffRaw / pipSize;

    // PnL in USD
    const pnl = priceDiffRaw * units;

    // Pip value in USD per pip
    const pipValue = units * pipSize;

    // Percentage return on margin/capital
    const pnlPct = effectiveCapital > 0 ? (pnl / effectiveCapital) * 100 : ((priceDiffRaw / entryPrice) * 100 * leverage);

    return {
        pnl: parseFloat(pnl.toFixed(2)),
        pnlPct: parseFloat(pnlPct.toFixed(2)),
        pipsMoved: parseFloat(pipsMoved.toFixed(1)),
        pipValue: parseFloat(pipValue.toFixed(4)),
        pipSize,
        category,
        units,
        lots: category === 'forex' ? units / 100000 : undefined
    };
}

