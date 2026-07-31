import { Request, Response } from 'express';
import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        initializeApp({
            credential: cert(serviceAccount),
        });
    } else {
        initializeApp({
            credential: applicationDefault(),
        });
    }
}
const db = getFirestore();

export default async function handler(req: Request, res: Response) {
    try {
        const doc = await db.collection('market').doc('prices').get();
        if (!doc.exists) {
            return res.json({});
        }
        res.json(doc.data());
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
}
