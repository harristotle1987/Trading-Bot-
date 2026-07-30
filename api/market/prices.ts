import { Request, Response } from 'express';
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
