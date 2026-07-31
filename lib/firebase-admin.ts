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

function parseCredentials(): any {
  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!rawKey) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable is missing.");
  }

  // Attempt 1: Decode Base64 string if configured as Base64
  try {
    const decoded = Buffer.from(rawKey, "base64").toString("utf-8");
    if (decoded.trim().startsWith("{")) {
      return JSON.parse(decoded);
    }
  } catch (_) {
    // Proceed to raw JSON handling if Base64 parsing fails
  }

  // Attempt 2: Parse raw JSON after sanitizing illegal control characters
  try {
    const sanitized = sanitizeJsonString(rawKey);
    return JSON.parse(sanitized);
  } catch (err: any) {
    throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT: ${err.message}`);
  }
}

/**
 * Lazy singleton getter preventing top-level module evaluation crashes
 */
export function getFirestoreDb() {
  if (getApps().length === 0) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const credentials = parseCredentials();
      initializeApp({
        credential: cert(credentials),
      });
    } else {
      initializeApp({
        credential: applicationDefault(),
      });
    }
    console.log("[Firebase Admin] Successfully initialized.");
  }
  return getFirestore();
}
