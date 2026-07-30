import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        
        let serviceAccount;
        try {
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        } catch (err) {
            console.warn("FIREBASE_SERVICE_ACCOUNT is not valid JSON. Ignoring.");
        }
        if (serviceAccount) {
            initializeApp({
                credential: cert(serviceAccount),
            });
        } else {
            initializeApp();
        }

    } else {
        initializeApp({
            /* Application default credentials */
        });
    }
}

export const db = getFirestore();
