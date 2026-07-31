import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        let serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!serviceAccountStr.trim().startsWith('{')) {
            serviceAccountStr = Buffer.from(serviceAccountStr, 'base64').toString('utf8');
        }
        const serviceAccount = JSON.parse(serviceAccountStr);
        initializeApp({
            credential: cert(serviceAccount),
        });
    } else {
        initializeApp({
            credential: applicationDefault(),
        });
    }
}
export const db = getFirestore();
