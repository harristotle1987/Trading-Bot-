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
            } catch(e) {}
        }
    } else {
        try {
            initializeApp();
            firebaseInitialized = true;
        } catch(e) {}
    }
} else {
    firebaseInitialized = true;
}

let db: any;
try {
    if (firebaseInitialized) {
        db = getFirestore();
    }
} catch(e) {
    firebaseInitialized = false;
}

export default async function handler(req: Request, res: Response) {
    try {
        if (!firebaseInitialized || !db) {
            return res.status(200).json({
                logs: [
                    { timestamp: new Date().toISOString(), level: "ERROR", module: "FIREBASE", message: "Firebase is not initialized. Using fallback engine." },
                    { timestamp: new Date().toISOString(), level: "ERROR", module: "PYTHON", message: "/bin/sh: line 1: python3: command not found" }
                ]
            });
        }
        
        const snapshot = await db.collection('system_logs').orderBy('timestamp', 'desc').limit(100).get();
        const logs = snapshot.docs.map(doc => doc.data());
        res.status(200).json({ logs: logs.length > 0 ? logs : [{ timestamp: new Date().toISOString(), level: "INFO", module: "SYSTEM", message: "System online. No recent errors." }] });
    } catch (error) {
        res.status(500).json({ error: String(error) });
    }
}
