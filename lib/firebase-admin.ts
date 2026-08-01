import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Sanitizes unescaped control characters (ASCII 0-31) inside JSON string literals
 * that cause "Bad control character in string literal in JSON" crashes.
 */
function sanitizeJsonString(raw: string): string {
  return raw.replace(/[\u0000-\u001F]+/g, (match) => {
    if (match === "\n") return "\\n";
    if (match === "\r") return "\\r";
    if (match === "\t") return "\\t";
    return "";
  });
}

/**
 * Lazy singleton getter preventing top-level module evaluation crashes
 */
export function getFirestoreDb() {
  if (getApps().length === 0) {
    try {
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const sanitized = sanitizeJsonString(process.env.FIREBASE_SERVICE_ACCOUNT);
        const credentials = JSON.parse(sanitized);
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
