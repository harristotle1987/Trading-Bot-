import { useState, useEffect } from 'react';
import { pusherClient as pusherInstance } from '../lib/pusher';

const DEFAULT_PRICES: Record<string, number> = {
    "BTCUSDT": 64250.00, "ETHUSDT": 3450.00, "SOLUSDT": 148.50, "XRPUSDT": 0.58, "BNBUSDT": 580.00,
    "ADAUSDT": 0.38, "DOGEUSDT": 0.12, "AVAXUSDT": 26.50, "LINKUSDT": 14.20, "DOTUSDT": 6.80,
    "NEARUSDT": 5.10, "SUIUSDT": 1.85, "APTUSDT": 8.40, "MATICUSDT": 0.52, "LTCUSDT": 72.00,
    "UNIUSDT": 7.80, "ATOMUSDT": 6.20, "ETCUSDT": 21.00, "FILUSDT": 4.80, "ARBUSDT": 0.62,
    "EURUSD": 1.0852, "GBPUSD": 1.2845, "USDJPY": 154.20, "AUDUSD": 0.6582, "USDCAD": 1.3745,
    "USDCHF": 0.8835, "NZDUSD": 0.5962, "EURGBP": 0.8448, "EURJPY": 167.35, "GBPJPY": 198.10,
    "AUDJPY": 101.50, "EURAUD": 1.6488, "GBPCAD": 1.7655, "CADJPY": 112.18, "CHFJPY": 174.55,
    "AAPL": 224.50, "MSFT": 448.20, "TSLA": 218.40, "AMZN": 182.60, "GOOGL": 172.80, "NVDA": 128.50, "META": 485.00
};

let globalPrices: Record<string, number> = { ...DEFAULT_PRICES };
let globalPositions: any[] = [];
let listeners: Function[] = [];
let isSubscribed = false;

const notifyListeners = () => {
    listeners.forEach(listener => listener({ prices: globalPrices, positions: globalPositions }));
};

// Helper to fetch market prices from API
const fetchPrices = async () => {
    try {
        const res = await fetch('/api/market/prices', { cache: 'no-store' });
        if (res.ok) {
            const data = await res.json();
            if (data && typeof data === 'object' && Object.keys(data).length > 0) {
                const changed = JSON.stringify(globalPrices) !== JSON.stringify({ ...globalPrices, ...data });
                if (changed) {
                    globalPrices = { ...globalPrices, ...data };
                    notifyListeners();
                }
            }
        }
    } catch (e) {
        // use fallbacks
    }
};

// Helper to fetch active positions directly from API
const fetchActivePositions = async () => {
    try {
        const res = await fetch('/api/trades/active', { cache: 'no-store' });
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
                const changed = JSON.stringify(globalPositions) !== JSON.stringify(data);
                if (changed) {
                    globalPositions = data;
                    notifyListeners();
                }
            }
        }
    } catch (e) {
        // Silently retain current positions on transient network drop during dev server restart
    }
};

// Initial fetches on module load
fetchPrices();
fetchActivePositions();

if (pusherInstance && !isSubscribed) {
    isSubscribed = true;
    const channel = pusherInstance.subscribe('trading-bot');
    channel.bind('market-update', function(pusherData: any) {
        if (pusherData.prices) {
            const changed = JSON.stringify(globalPrices) !== JSON.stringify({ ...globalPrices, ...pusherData.prices });
            if (changed) {
                globalPrices = { ...globalPrices, ...pusherData.prices };
                notifyListeners();
            }
        }
    });
    channel.bind('positions-update', function(pusherData: any) {
        if (pusherData.positions) {
            const changed = JSON.stringify(globalPositions) !== JSON.stringify(pusherData.positions);
            if (changed) {
                globalPositions = pusherData.positions;
                notifyListeners();
            }
        }
    });
}

export function useRealtimeData(selector: 'prices' | 'positions' | 'both' = 'both') {
    const [data, setData] = useState(() => {
        return { 
            prices: selector === 'positions' ? {} : globalPrices, 
            positions: selector === 'prices' ? [] : globalPositions 
        };
    });

    useEffect(() => {
        let lastPrices = globalPrices;
        let lastPositions = globalPositions;

        const listener = (newData: any) => {
            let shouldUpdate = false;
            
            if (selector !== 'positions' && lastPrices !== newData.prices) {
                shouldUpdate = true;
            }
            if (selector !== 'prices' && lastPositions !== newData.positions) {
                shouldUpdate = true;
            }
            
            if (shouldUpdate) {
                lastPrices = newData.prices;
                lastPositions = newData.positions;
                setData({ 
                    prices: selector === 'positions' ? {} : lastPrices, 
                    positions: selector === 'prices' ? [] : lastPositions 
                });
            }
        };
        listeners.push(listener);

        // Fetch on mount
        fetchPrices();
        fetchActivePositions();

        // Listen for trade_updated & balance_updated window events
        const handleTradeUpdate = () => {
            fetchActivePositions();
            fetchPrices();
        };

        window.addEventListener('trade_updated', handleTradeUpdate);
        window.addEventListener('balance_updated', handleTradeUpdate);

        // Polling interval (every 2.5s) to guarantee synced state
        const pollInterval = setInterval(() => {
            fetchPrices();
            fetchActivePositions();
        }, 2500);

        return () => {
            listeners = listeners.filter(l => l !== listener);
            window.removeEventListener('trade_updated', handleTradeUpdate);
            window.removeEventListener('balance_updated', handleTradeUpdate);
            clearInterval(pollInterval);
        };
    }, [selector]);

    return data;
}