import { Request, Response } from 'express';
import { db } from '../../lib/firebase-admin';

export default async function handler(req: Request, res: Response) {
    try {
        const snapshot = await db.collection('user_accounts').doc('demo').collection('active_trades').get();
        const activePositions = snapshot.docs.map(doc => doc.data());
        res.json(activePositions);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
}
