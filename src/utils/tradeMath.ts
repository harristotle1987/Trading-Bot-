export type AssetCategory = 'crypto' | 'forex';

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

    if (category === 'crypto') {
        // Crypto Logic
        contractSize = notionalValue / entryPrice;
        contractSizeStr = `${contractSize.toFixed(4)}`;
        
        pipValue = contractSize; 
        
        maxRiskAtSL = Math.abs(entryPrice - slPrice) * contractSize;
        maxGainAtTP = Math.abs(tpPrice - entryPrice) * contractSize;
    } else if (category === 'forex') {
        // Forex Logic (Pip Value Engine)
        const standardLotUnits = 100000;
        
        contractSize = notionalValue / standardLotUnits;
        contractSizeStr = `${contractSize.toFixed(2)} Lots`;
        
        const pipSize = 0.0001; 
        
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
