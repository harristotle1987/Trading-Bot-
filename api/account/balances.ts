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
    // Assuming a collection 'user_accounts' and a document for the user
    // For now, using a static doc ID 'demo' for demonstration
    const docRef = db.collection('user_accounts').doc('demo');
    const doc = await docRef.get();
    
    if (!doc.exists) {
        // Fallback or handle appropriately
        return res.status(404).json({ error: "Account not found" });
    }
    
    res.status(200).json(doc.data());
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
}
