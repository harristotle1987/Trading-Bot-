import { Request, Response } from 'express';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        initializeApp({
            credential: cert(serviceAccount),
        });
    } else {
        initializeApp({
            /* Application default credentials */
        });
    }
}
const db = getFirestore();

export default async function handler(req: Request, res: Response) {
    try {
        const snapshot = await db.collection('user_accounts').doc('demo').collection('closed_trades').get();
        const closedPositions = snapshot.docs.map(doc => doc.data());
        res.json(closedPositions);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
}
