import { Request, Response } from 'express';
import { db } from '../../lib/firebase-admin';

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
