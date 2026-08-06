import { initializeApp, getApps, getApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

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

if (!getApps().length) {
    let credential;
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

    try {
        initializeApp({
            credential,
            projectId,
        });
        console.log('Firebase Admin initialized with projectId:', projectId);
    } catch (e) {
        console.error('Failed to initialize Firebase Admin:', e);
    }
}

const currentApp = getApps().length ? getApp() : null;

export const adminDb = currentApp ? getFirestore(currentApp) : null;
export const adminAuth = currentApp ? getAuth(currentApp) : null;

export async function initFirebaseAdmin() {
    return { db: adminDb, auth: adminAuth };
}


