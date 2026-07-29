const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Imports
if (!code.includes('firebase/app')) {
    code = code.replace('import dotenv from "dotenv";', `import dotenv from "dotenv";\nimport { initializeApp } from "firebase/app";\nimport { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";`);
}

// Variables & Init
if (!code.includes('let db = null;')) {
    const initCode = `
  let demoBalance = 10000;
  let db: any = null;

  try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          const firebaseApp = initializeApp(config);
          db = getFirestore(firebaseApp, config.firestoreDatabaseId);

          getDoc(doc(db, "system", "balances")).then(snap => {
              if (snap.exists()) {
                  demoBalance = snap.data().demoBalance;
              } else {
                  setDoc(doc(db, "system", "balances"), { demoBalance });
              }
              console.log("Loaded demoBalance from Firestore:", demoBalance);
          }).catch(err => {
              console.error("Error loading demoBalance from Firestore:", err);
          });
      }
  } catch (err) {
      console.error("Firebase client SDK init error:", err);
  }
`;
    code = code.replace('  let demoBalance = 10000;', initCode);
}

// Balance updates
code = code.replace('demoBalance = 10000;\n    res.json({ balance: demoBalance });', `demoBalance = 10000;
    if (db) setDoc(doc(db, "system", "balances"), { demoBalance }, { merge: true }).catch(console.error);
    res.json({ balance: demoBalance });`);

code = code.replace('demoBalance += realized_pnl;', `demoBalance += realized_pnl;
            if (db) setDoc(doc(db, "system", "balances"), { demoBalance }, { merge: true }).catch(console.error);`);

fs.writeFileSync('server.ts', code);
