import { useState, useEffect } from 'react';
import { pusherClient as pusherInstance } from '../lib/pusher';

let globalPrices: Record<string, number> = {};
let globalPositions: any[] = [];
let listeners: Function[] = [];
let isSubscribed = false;

const notifyListeners = () => {
    listeners.forEach(listener => listener({ prices: { ...globalPrices }, positions: [...globalPositions] }));
};

// Helper to fetch active positions directly from API
const fetchActivePositions = async () => {
    try {
        const res = await fetch('/api/trades/active', { cache: 'no-store' });
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
                globalPositions = data;
                notifyListeners();
            }
        }
    } catch (e) {
        console.warn('Failed to fetch active positions:', e);
    }
};

// Initial fetch on module load
fetchActivePositions();

if (pusherInstance && !isSubscribed) {
    isSubscribed = true;
    const channel = pusherInstance.subscribe('trading-bot');
    channel.bind('market-update', function(pusherData: any) {
        if (pusherData.prices) {
            globalPrices = pusherData.prices;
            notifyListeners();
        }
    });
    channel.bind('positions-update', function(pusherData: any) {
        if (pusherData.positions) {
            globalPositions = pusherData.positions;
            notifyListeners();
        }
    });
}

export function useRealtimeData() {
    const [data, setData] = useState({ prices: globalPrices, positions: globalPositions });

    useEffect(() => {
        const listener = (newData: any) => setData(newData);
        listeners.push(listener);

        // Fetch on mount
        fetchActivePositions();

        // Listen for trade_updated & balance_updated window events
        const handleTradeUpdate = () => {
            fetchActivePositions();
        };

        window.addEventListener('trade_updated', handleTradeUpdate);
        window.addEventListener('balance_updated', handleTradeUpdate);

        // Polling interval (every 2.5s) to guarantee synced state
        const pollInterval = setInterval(() => {
            fetchActivePositions();
        }, 2500);

        return () => {
            listeners = listeners.filter(l => l !== listener);
            window.removeEventListener('trade_updated', handleTradeUpdate);
            window.removeEventListener('balance_updated', handleTradeUpdate);
            clearInterval(pollInterval);
        };
    }, []);

    return data;
}