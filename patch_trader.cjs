const fs = require('fs');

let content = fs.readFileSync('services/nvidia_trader.ts', 'utf8');

content = content.replace(
/export interface TradeSignal {[\s\S]*?}/,
`export interface TradeSignal {
  symbol: string;
  type: 'UP' | 'DOWN';
  entryPrice: number;
  exitTime: string;
  winRate: string;
  slPrice: number;
  tpPrice: number;
}`
);

content = content.replace(
/    { symbol: 'BTCUSDT', type: 'UP', entryPrice: 65200, exitTime: '14:00', winRate: '88%' },/g,
`    { symbol: 'BTCUSDT', type: 'UP', entryPrice: 65200, exitTime: '14:00', winRate: '88%', slPrice: 64500, tpPrice: 66600 },`
);

content = content.replace(
/    { symbol: 'ETHUSDT', type: 'DOWN', entryPrice: 3450, exitTime: '14:30', winRate: '82%' },/g,
`    { symbol: 'ETHUSDT', type: 'DOWN', entryPrice: 3450, exitTime: '14:30', winRate: '82%', slPrice: 3500, tpPrice: 3350 },`
);

content = content.replace(
/    { symbol: 'EURUSD', type: 'UP', entryPrice: 1.0850, exitTime: '15:00', winRate: '79%' },/g,
`    { symbol: 'EURUSD', type: 'UP', entryPrice: 1.0850, exitTime: '15:00', winRate: '79%', slPrice: 1.0820, tpPrice: 1.0910 },`
);

fs.writeFileSync('services/nvidia_trader.ts', content);
