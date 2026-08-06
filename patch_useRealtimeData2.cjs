const fs = require('fs');
let code = `
import { useState, useEffect } from 'react';
import { pusherClient as pusherInstance } from '../lib/pusher';

let globalPrices: Record<string, number> = {};
let globalPositions: any[] = [];
let listeners: Function[] = [];
let isSubscribed = false;

const notifyListeners = () => {
    listeners.forEach(listener => listener({ prices: { ...globalPrices }, positions: [...globalPositions] }));
};

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

        return () => {
            listeners = listeners.filter(l => l !== listener);
        };
    }, []);

    return data;
}
`;
fs.writeFileSync('src/hooks/useRealtimeData.ts', code.trim());
