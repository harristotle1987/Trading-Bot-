import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Lazy singleton getter preventing top-level module evaluation crashes
 */
export function getFirestoreDb() {
  if (getApps().length === 0) {
    try {
      initializeApp({
        credential: applicationDefault(),
      });
      console.log("[Firebase Admin] Successfully initialized with application default credentials.");
    } catch (error) {
      console.error("[Firebase Admin] Failed to initialize:", error);
      throw error;
    }
  }
  return getFirestore();
}
