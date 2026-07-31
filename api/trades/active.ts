import { Request, Response } from 'express';
import { getFirestoreDb } from '../../lib/firebase-admin.js';

export default async function handler(req: Request, res: Response) {
    try {
        const db = getFirestoreDb();
        const snapshot = await db.collection('user_accounts').doc('demo').collection('active_trades').get();
        const activePositions = snapshot.docs.map(doc => doc.data());
        res.json(activePositions);
    } catch (error) {
        const details = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: "Failed to fetch active trades", details });
    }
}
