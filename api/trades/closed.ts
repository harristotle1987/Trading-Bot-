import { Request, Response } from 'express';
import { db } from '../../lib/firebase-admin';

export default async function handler(req: Request, res: Response) {
    try {
        const snapshot = await db.collection('user_accounts').doc('demo').collection('closed_trades').get();
        const closedPositions = snapshot.docs.map(doc => doc.data());
        res.json(closedPositions);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
}
