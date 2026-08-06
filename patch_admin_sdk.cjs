const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/import \{ initializeApp \} from "firebase\/app";\n/, '');
code = code.replace(/import \{ getFirestore, doc, getDoc, setDoc, onSnapshot \} from "firebase\/firestore";\n/, '');
code = code.replace('import { CTraderConnection }', 'import { adminDb as db } from "./src/lib/firebase";\nimport { CTraderConnection }');

code = code.replace(/let db: any = null;\s*try \{\s*const configPath = path\.join\(process\.cwd\(\), 'firebase-applet-config\.json'\);\s*if \(fs\.existsSync\(configPath\)\) \{\s*const config = JSON\.parse\(fs\.readFileSync\(configPath, 'utf8'\)\);\s*const firebaseApp = initializeApp\(config\);\s*db = getFirestore\(firebaseApp, config\.firestoreDatabaseId\);\s*onSnapshot\(doc\(db, "system", "balances"\), \(snap\) => \{\s*if \(snap\.exists\(\)\) \{\s*demoBalance = snap\.data\(\)\.demoBalance \?\? 10000;\s*liveBalance = snap\.data\(\)\.liveBalance \?\? 50000\.0;\s*\}\s*\}\);\s*\} else \{\s*setDoc\(doc\(db, "system", "balances"\), \{ demoBalance, liveBalance \}\);\s*\}\s*\} catch \(e\) \{\s*console\.error\('Firebase init error:', e\);\s*\}/s, `
  try {
      if (db) {
          db.collection("system").doc("balances").onSnapshot((snap) => {
              if (snap.exists) {
                  demoBalance = snap.data().demoBalance ?? 10000;
                  liveBalance = snap.data().liveBalance ?? 50000.0;
              }
          });
      }
  } catch (e) {
      console.error('Firebase init error:', e);
  }
`);

code = code.replace(/onSnapshot\(doc\(db, "(.*?)", "(.*?)"\)/g, 'db.collection("$1").doc("$2").onSnapshot');
code = code.replace(/setDoc\(doc\(db, "(.*?)", "(.*?)"\),/g, 'db.collection("$1").doc("$2").set(');
code = code.replace(/getDoc\(doc\(db, "(.*?)", "(.*?)"\)\)/g, 'db.collection("$1").doc("$2").get()');
code = code.replace(/snap\.exists\(\)/g, 'snap.exists');

fs.writeFileSync('server.ts', code);
