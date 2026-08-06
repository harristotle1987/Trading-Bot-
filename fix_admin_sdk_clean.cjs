const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/import \{ initializeApp \} from "firebase\/app";/g, '');
code = code.replace(/import \{ getFirestore, doc, getDoc, setDoc, onSnapshot \} from "firebase\/firestore";/g, 'import { adminDb as db } from "./src/lib/firebase";');

const oldDbInit = `
  let db: any = null;
  try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          const firebaseApp = initializeApp(config);
          db = getFirestore(firebaseApp, config.firestoreDatabaseId);
          db.collection("system").doc("balances").onSnapshot((snap) => {
              if (snap.exists) {
                  demoBalance = snap.data().demoBalance ?? 10000;
                  liveBalance = snap.data().liveBalance ?? 50000.0;
                  console.log("Synced balances from Firestore:", demoBalance, liveBalance);
              } else {
                  db.collection("system").doc("balances").set( { demoBalance, liveBalance });
              }
          }, (err: any) => {
              console.error("Error loading balances from Firestore:", err);
          });
      }
  } catch (err) {
      console.error("Firebase client SDK init error:", err);
  }
`;

const newDbInit = `
  try {
      if (db) {
          db.collection("system").doc("balances").onSnapshot((snap) => {
              if (snap.exists) {
                  demoBalance = snap.data().demoBalance ?? 10000;
                  liveBalance = snap.data().liveBalance ?? 50000.0;
                  console.log("Synced balances from Firestore:", demoBalance, liveBalance);
              } else {
                  db.collection("system").doc("balances").set( { demoBalance, liveBalance });
              }
          }, (err) => {
              console.error("Error loading balances from Firestore:", err);
          });
      }
  } catch (err) {
      console.error("Firebase admin SDK init error:", err);
  }
`;

// Using a safer replace for the block since whitespace might vary
code = code.replace(/let db: any = null;[\s\S]*?console\.error\("Firebase client SDK init error:", err\);\s*\}/, newDbInit.trim());

fs.writeFileSync('server.ts', code);
