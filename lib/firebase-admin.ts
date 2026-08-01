import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Lazy singleton getter preventing top-level module evaluation crashes
 */
export function getFirestoreDb() {
  if (getApps().length === 0) {
    try {
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        let credentials;
        const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
        
        try {
          if (rawKey.startsWith("{")) {
            try {
              credentials = JSON.parse(rawKey);
            } catch (parseError) {
              // Attempt to fix unescaped newlines in the private key which happens when pasting into Vercel
              const fixedKey = rawKey.replace(/(-----BEGIN PRIVATE KEY-----\s*[\s\S]+?\s*-----END PRIVATE KEY-----)/, (match) => {
                return match.replace(/\n/g, '\\n').replace(/\r/g, '');
              });
              credentials = JSON.parse(fixedKey);
            }
          } else {
            // Try base64
            const decoded = Buffer.from(rawKey, "base64").toString("utf-8");
            credentials = JSON.parse(decoded);
          }
        } catch (error) {
          console.error("[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT. Make sure it is valid JSON or Base64. First few chars:", rawKey.substring(0, 15));
          throw error;
        }
        
        initializeApp({
          credential: cert(credentials),
        });
        console.log("[Firebase Admin] Successfully initialized with service account.");
      } else {
        initializeApp({
          credential: applicationDefault(),
        });
        console.log("[Firebase Admin] Successfully initialized with application default credentials.");
      }
    } catch (error) {
      console.error("[Firebase Admin] Failed to initialize:", error);
      throw error;
    }
  }
  return getFirestore();
}
