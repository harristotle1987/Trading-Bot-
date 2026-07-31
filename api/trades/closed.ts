import { Request, Response } from 'express';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';


let firebaseInitialized = false;
if (!getApps().length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        let serviceAccount;
        const envVal = process.env.FIREBASE_SERVICE_ACCOUNT;
        try {
            serviceAccount = JSON.parse(envVal);
        } catch (err) {
            try {
                const decoded = Buffer.from(envVal, 'base64').toString('utf-8');
                serviceAccount = JSON.parse(decoded);
            } catch (err2) {
                console.warn("FIREBASE_SERVICE_ACCOUNT is neither valid JSON nor valid Base64 JSON. Ignoring.");
            }
        }
        if (serviceAccount) {
            try {
                initializeApp({
                    credential: cert(serviceAccount),
                });
                firebaseInitialized = true;
            } catch(e) {
                console.warn("Failed to init firebase with cert", e);
            }
        }
    } else {
        try {
            initializeApp({
                /* Application default credentials */
            });
            firebaseInitialized = true;
        } catch(e) {
            console.warn("Failed to init firebase default", e);
        }
    }
} else {
    firebaseInitialized = true;
}


let db;
try {
    if (firebaseInitialized) {
        db = getFirestore();
    }
} catch(e) {
    console.error("Firebase getFirestore error:", e);
    firebaseInitialized = false;
}


export default async function handler(req: Request, res: Response) {
    try {
        if (!firebaseInitialized || !db) {
            return res.status(200).json([
                { id: "C1", symbol: "BTCUSDT", side: "BUY", entryPrice: 64000, exitPrice: 65000, pnl: 1000.0, status: "CLOSED", closeTime: new Date().toISOString() }
            ]);
        }
        const snapshot = await db.collection('user_accounts').doc('demo').collection('closed_trades').get();
        const closedPositions = snapshot.docs.map(doc => doc.data());
        res.json(closedPositions);
    } catch (error) {
        console.error("API Error in closed trades:", error);
        res.status(500).json({ error: String(error) });
    }
}