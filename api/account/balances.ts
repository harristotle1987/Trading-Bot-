import { Request, Response } from 'express';
import { getFirestoreDb } from '../../lib/firebase-admin.js';

export default async function handler(req: Request, res: Response) {
  try {
    const db = getFirestoreDb();
    const docRef = db.collection('user_accounts').doc('demo');
    const doc = await docRef.get();
    
    if (!doc.exists) {
        return res.status(404).json({ error: "Account not found" });
    }
    
    res.status(200).json(doc.data());
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: "Failed to fetch balances", details });
  }
}
