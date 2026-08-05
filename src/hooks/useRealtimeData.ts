import { useState, useEffect } from 'react';
import Pusher from 'pusher-js';

let pusherInstance: Pusher | null = null;
let globalPrices: Record<string, number> = {};
let globalPositions: any[] = [];
let listeners: Function[] = [];

const notifyListeners = () => {
    listeners.forEach(listener => listener({ prices: { ...globalPrices }, positions: [...globalPositions] }));
};

export function useRealtimeData() {
    const [data, setData] = useState({ prices: globalPrices, positions: globalPositions });

    useEffect(() => {
        const listener = (newData: any) => setData(newData);
        listeners.push(listener);

        if (!pusherInstance && import.meta.env.VITE_PUSHER_KEY && import.meta.env.VITE_PUSHER_CLUSTER) {
            pusherInstance = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
                cluster: import.meta.env.VITE_PUSHER_CLUSTER
            });

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

        return () => {
            listeners = listeners.filter(l => l !== listener);
        };
    }, []);

    return data;
}
