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
        let credentials;
        try {
          // Check if it's base64 encoded first
          const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, "base64").toString("utf-8");
          if (decoded.trim().startsWith("{")) {
            credentials = JSON.parse(decoded);
          } else {
            throw new Error("Not base64");
          }
        } catch (e) {
          // Fallback to raw string
          const sanitized = sanitizeJsonString(process.env.FIREBASE_SERVICE_ACCOUNT);
          try {
            credentials = JSON.parse(sanitized);
          } catch (parseError: any) {
            console.error("[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT. Make sure you pasted the exact JSON file contents without adding extra characters or quotes. First few chars:", process.env.FIREBASE_SERVICE_ACCOUNT.substring(0, 10));
            throw parseError;
          }
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
