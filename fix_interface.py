import re

with open("src/components/PocketSignalsWorkspace.tsx", "r") as f:
    content = f.read()

interface_idx = content.find("export interface PocketSignal {")
end_interface = content.find("}", interface_idx)

replacement = """export interface PocketSignal {
  id: string;
  symbol: string;
  isOtc: boolean;
  category: 'crypto' | 'forex' | 'stocks' | 'commodities';
  direction: 'CALL' | 'PUT' | 'NO_TRADE';
  expiry: string; // timeframe
  entryPrice: number;
  currentPrice: number;
  takeProfit?: number;
  stopLoss?: number;
  winRate: number;
  payoutPct: number;
  confidence: 'HIGH_CONFLUENCE' | 'ULTRA_ACCURATE' | 'STRONG_TREND';
  strategyUsed: string;
  indicators: string[];
  finnhubSentiment?: string;
  exchangeRateValidation?: string;
  ctraderValidation?: string;
  dailyTradeIndex?: string;
  martingaleStep: string;
  createdAt: number;
  expiryTimestamp: number;
  status: 'ACTIVE' | 'EXPIRED_WIN' | 'EXPIRED_LOSS';
  signalScore: number;
  expectedValue: number;
  strategyAgreement: number;
  marketRegime: string;
  mlProbability?: number;
  validUntil: number;
}
"""

content = content[:interface_idx] + replacement + content[end_interface+1:]
with open("src/components/PocketSignalsWorkspace.tsx", "w") as f:
    f.write(content)
print("Updated interface")
