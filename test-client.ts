import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import fs from 'fs';

try {
  const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
  const app = initializeApp(config);
  const db = getFirestore(app, config.firestoreDatabaseId);

  async function run() {
    await setDoc(doc(db, "system", "balances"), { demoBalance: 12000 });
    const snap = await getDoc(doc(db, "system", "balances"));
    console.log("Success:", snap.data());
    process.exit(0);
  }
  run().catch(e => {
    console.log("Error running:", e);
    process.exit(1);
  });
} catch(e) {
  console.log("Error init:", e);
}
