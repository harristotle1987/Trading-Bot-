import { Request, Response } from 'express';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';


let firebaseInitialized = false;
if (!getApps().length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        let serviceAccount;
        const envVal = process.env.FIREBASE_SERVICE_ACCOUNT;
        try {
            serviceAccount = JSON.parse(envVal);
        } catch (err) {
            try {
                const decoded = Buffer.from(envVal, 'base64').toString('utf-8');
                serviceAccount = JSON.parse(decoded);
            } catch (err2) {
                console.warn("FIREBASE_SERVICE_ACCOUNT is neither valid JSON nor valid Base64 JSON. Ignoring.");
            }
        }
        if (serviceAccount) {
            try {
                initializeApp({
                    credential: cert(serviceAccount),
                });
                firebaseInitialized = true;
            } catch(e) {
                console.warn("Failed to init firebase with cert", e);
            }
        }
    } else {
        try {
            initializeApp({
                /* Application default credentials */
            });
            firebaseInitialized = true;
        } catch(e) {
            console.warn("Failed to init firebase default", e);
        }
    }
} else {
    firebaseInitialized = true;
}

const db = getFirestore();

export default async function handler(req: Request, res: Response) {
  try {
    // Assuming a collection 'user_accounts' and a document for the user
    // For now, using a static doc ID 'demo' for demonstration
    const docRef = db.collection('user_accounts').doc('demo');
    
    if (!firebaseInitialized) {
        return res.status(200).json({
            "demo": {
                "total_equity": 11412.02,
                "available_balance": 11412.02,
                "currency": "USDT",
                "status": "ONLINE"
            },
            "bybit_live": {
                "total_equity": 0,
                "available_balance": 0,
                "currency": "USDT",
                "status": "ONLINE"
            }
        });
    }
    const doc = await docRef.get();
    if (!doc.exists) {
        return res.status(404).json({ error: "Account not found" });
    }
    res.status(200).json(doc.data());
    
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
}
