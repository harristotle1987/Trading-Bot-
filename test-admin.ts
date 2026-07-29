import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

try {
  const app = initializeApp({
    credential: applicationDefault(),
    projectId: "gen-lang-client-0502458518"
  });
  const db = getFirestore(app, "ai-studio-obsidianprivatet-05d789cb-f4fa-4005-ac89-3796d54fe62c");
  db.collection("test").doc("test").set({hello: "world"}).then(() => {
    console.log("Success");
    process.exit(0);
  }).catch(e => {
    console.log("Error writing:", e);
    process.exit(1);
  });
} catch(e) {
  console.log("Error init:", e);
}
