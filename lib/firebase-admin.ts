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
        let rawKey = process.env.FIREBASE_SERVICE_ACCOUNT.trim();

        if (rawKey.startsWith("'") && rawKey.endsWith("'")) {
           rawKey = rawKey.slice(1, -1).trim();
        }
        if (rawKey.startsWith('"') && rawKey.endsWith('"')) {
           try { rawKey = JSON.parse(rawKey); } catch (e) {}
           rawKey = rawKey.trim();
        }
        
        try {
          if (rawKey.startsWith("{")) {
            try {
              credentials = JSON.parse(rawKey);
            } catch (parseError) {
              // Aggressive fallback: Extract values using regex if JSON parse fails
              // due to unescaped characters from Vercel's environment variables.
              const projectIdMatch = rawKey.match(/"project_id"\s*:\s*"([^"]+)"/);
              const clientEmailMatch = rawKey.match(/"client_email"\s*:\s*"([^"]+)"/);
              const privateKeyMatch = rawKey.match(/"private_key"\s*:\s*"([\s\S]+?)"/);
              
              if (projectIdMatch && clientEmailMatch && privateKeyMatch) {
                credentials = {
                  projectId: projectIdMatch[1],
                  clientEmail: clientEmailMatch[1],
                  privateKey: privateKeyMatch[1].replace(/\\n/g, '\n').replace(/\r/g, '')
                };
              } else {
                throw parseError; // Rethrow original if regex doesn't find the fields
              }
            }
          } else {
            // Try base64
            const decoded = Buffer.from(rawKey, "base64").toString("utf-8");
            credentials = JSON.parse(decoded);
          }
        } catch (error: any) {
          console.error("[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT. Make sure it is valid JSON or Base64.");
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
