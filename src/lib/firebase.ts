import { initializeApp, getApps, getApp, cert, applicationDefault } from 'firebase-admin/app';
import fs from 'fs';
import path from 'path';

// Prevent multiple initialization errors during hot-reloads
if (!getApps().length) {
    let credential;
    
    // Read the project ID from the config file if available
    let projectId: string | undefined = undefined;
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            projectId = config.projectId;
        } catch (e) {
            console.error('Error reading firebase config for project ID:', e);
        }
    }

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            credential = cert(serviceAccount);
            if (serviceAccount.project_id) {
                projectId = serviceAccount.project_id;
            }
        } catch (e) {
            console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT is not a valid JSON object. Expected a full Service Account JSON key from Firebase Console.');
            credential = applicationDefault();
        }
    } else {
        credential = applicationDefault();
    }

    initializeApp({
        credential,
        projectId,
    });
    console.log('Firebase Admin initialized with projectId:', projectId);
}

// In firebase-admin, target the default database for project stability
import { getFirestore } from 'firebase-admin/firestore';

export const adminDb = getFirestore(getApp());
import { getAuth } from 'firebase-admin/auth';
export const adminAuth = getAuth(getApp());
