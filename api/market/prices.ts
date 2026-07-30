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
        const doc = await db.collection('market').doc('prices').get();
        if (!doc.exists) {
            return res.json({});
        }
        res.json(doc.data());
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
}
