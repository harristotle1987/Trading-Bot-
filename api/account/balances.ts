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
