import { Request, Response } from 'express';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } else {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
        });
    }
}
const db = admin.firestore();

export default async function handler(req: Request, res: Response) {
    try {
        const snapshot = await db.collection('user_accounts').doc('demo').collection('active_trades').get();
        const activePositions = snapshot.docs.map(doc => doc.data());
        res.json(activePositions);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
}
