import { initializeApp, getApps, getApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

let projectId: string | undefined = process.env.FIREBASE_PROJECT_ID || process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
if (fs.existsSync(configPath)) {
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.projectId) projectId = config.projectId;
    } catch (e) {
        console.error('Error reading firebase config for project ID:', e);
    }
}
if (!projectId) {
    projectId = "trading-bot-backend-ce93e";
}

let hasValidCredentials = false;

if (!getApps().length) {
    let credential;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            credential = cert(serviceAccount);
            if (serviceAccount.project_id) {
                projectId = serviceAccount.project_id;
            }
            hasValidCredentials = true;
        } catch (e) {
            console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT is not a valid JSON object.');
        }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        hasValidCredentials = true;
    }

    try {
        if (hasValidCredentials) {
            initializeApp({
                ...(credential ? { credential } : {}),
                projectId,
            });
            console.log('Firebase Admin initialized with projectId:', projectId);
        } else {
            console.log('ℹ️ No FIREBASE_SERVICE_ACCOUNT found. Operating in-memory mode without Firestore.');
        }
    } catch (e) {
        console.warn('Failed to initialize Firebase Admin:', e);
    }
} else {
    hasValidCredentials = true;
}

const currentApp = (getApps().length && hasValidCredentials) ? getApp() : null;

let dbInstance = null;
let authInstance = null;

if (currentApp) {
    try {
        dbInstance = getFirestore(currentApp);
        authInstance = getAuth(currentApp);
    } catch (e) {
        console.warn('Firestore/Auth init skipped:', e);
    }
}

export const adminDb = dbInstance;
export const adminAuth = authInstance;

export async function initFirebaseAdmin() {
    return { db: adminDb, auth: adminAuth };
}


