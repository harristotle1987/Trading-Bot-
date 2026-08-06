import fs from 'fs';
import path from 'path';

let dbInstance: any = null;
let authInstance: any = null;
let initPromise: Promise<{ db: any; auth: any }> | null = null;

export async function initFirebaseAdmin() {
    if (dbInstance) return { db: dbInstance, auth: authInstance };
    if (initPromise) return initPromise;

    initPromise = (async () => {
        try {
            // Dynamically import pure ESM modules (firebase-admin, jose, jwks-rsa) to avoid CJS require() errors
            const { initializeApp, getApps, getApp, cert, applicationDefault } = await import('firebase-admin/app');
            const { getFirestore } = await import('firebase-admin/firestore');
            const { getAuth } = await import('firebase-admin/auth');

            let credential;
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

            const app = getApp();
            dbInstance = getFirestore(app);
            authInstance = getAuth(app);
            return { db: dbInstance, auth: authInstance };
        } catch (e) {
            console.error('Error initializing Firebase Admin via dynamic import:', e);
            return { db: null, auth: null };
        }
    })();

    return initPromise;
}

// Immediately trigger initialization asynchronously
initFirebaseAdmin();

// Proxies to maintain full backward compatibility with static exports
export const adminDb: any = new Proxy({}, {
    get(_target, prop) {
        if (!dbInstance) return undefined;
        const val = Reflect.get(dbInstance, prop);
        return typeof val === 'function' ? val.bind(dbInstance) : val;
    }
});

export const adminAuth: any = new Proxy({}, {
    get(_target, prop) {
        if (!authInstance) return undefined;
        const val = Reflect.get(authInstance, prop);
        return typeof val === 'function' ? val.bind(authInstance) : val;
    }
});

