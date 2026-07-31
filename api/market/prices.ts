import { Request, Response } from 'express';
import { getFirestoreDb } from '../../lib/firebase-admin.js';

export default async function handler(req: Request, res: Response) {
    try {
        const db = getFirestoreDb();
        const doc = await db.collection('market').doc('prices').get();
        if (!doc.exists) {
            return res.json({});
        }
        res.json(doc.data());
    } catch (error) {
        const details = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: "Failed to fetch prices", details });
    }
}
