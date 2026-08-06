import PusherServer from 'pusher';
import PusherClient from 'pusher-js';

// Server instance (for Node.js)
// This will be treeshaken by Vite in client builds as long as you don't import it in React components.
export const pusherServer = typeof process !== 'undefined' && process.env.PUSHER_APP_ID
    ? new PusherServer({
        appId: process.env.PUSHER_APP_ID || '',
        key: process.env.PUSHER_KEY || '',
        secret: process.env.PUSHER_SECRET || '',
        cluster: process.env.PUSHER_CLUSTER || '',
        useTLS: true
      })
    : null;

// Client instance (for Browser)
// This uses Vite's import.meta.env for client-side environment variables.
const getEnvVar = (key: string) => {
    try {
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            return import.meta.env[key] || '';
        }
    } catch (_) {}
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key] || '';
    }
    return '';
};

export const pusherClient = typeof window !== 'undefined'
    ? new PusherClient(getEnvVar('VITE_PUSHER_KEY'), {
        cluster: getEnvVar('VITE_PUSHER_CLUSTER'),
      })
    : null;
