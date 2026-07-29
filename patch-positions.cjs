const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Replace GLOBAL_POSITIONS initialization to load from Firestore
const loadPositionsCode = `
  let GLOBAL_POSITIONS: any[] = [];
  let nextPosId = 1;

  if (db) {
      getDoc(doc(db, "system", "trades")).then(snap => {
          if (snap.exists() && snap.data().positions) {
              GLOBAL_POSITIONS = snap.data().positions;
              nextPosId = GLOBAL_POSITIONS.length + 1;
              console.log("Loaded " + GLOBAL_POSITIONS.length + " trades from Firestore");
          }
      }).catch(err => console.error("Error loading trades:", err));
  }
`;

code = code.replace(/let GLOBAL_POSITIONS[\s\S]*?const saveTrades = \(\) => {[\s\S]*?};/, loadPositionsCode + '\n  const saveTrades = () => {\n      if (db) setDoc(doc(db, "system", "trades"), { positions: GLOBAL_POSITIONS }).catch(console.error);\n  };');

fs.writeFileSync('server.ts', code);
