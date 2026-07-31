const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Add liveBalance
code = code.replace('let demoBalance = 10000;', 'let demoBalance = 10000;\n  let liveBalance = 50000.0;');

// Update Firestore initialization
code = code.replace('demoBalance = snap.data().demoBalance;', 'demoBalance = snap.data().demoBalance ?? 10000;\n                  liveBalance = snap.data().liveBalance ?? 50000.0;');
code = code.replace('setDoc(doc(db, "system", "balances"), { demoBalance });', 'setDoc(doc(db, "system", "balances"), { demoBalance, liveBalance });');
code = code.replace('console.log("Loaded demoBalance from Firestore:", demoBalance);', 'console.log("Loaded demoBalance from Firestore:", demoBalance, "liveBalance:", liveBalance);');

// Update close trade for LIVE
code = code.replace('// Placeholder for real exchange API call\n            console.log("LIVE trade closed, need real exchange API call");', 'liveBalance += realized_pnl;\n            if (db) setDoc(doc(db, "system", "balances"), { liveBalance }, { merge: true }).catch(console.error);\n            console.log("LIVE trade closed, updated simulated liveBalance to:", liveBalance);');

// Update /api/account/balances
const newLiveDataLogic = `
      let live_data = { total_equity: liveBalance, available_balance: liveBalance, currency: "USDT", status: "SIMULATED" };
      
      if (BYBIT_API_KEY && BYBIT_API_SECRET) {
`;
code = code.replace('let live_data = { total_equity: 0.0, available_balance: 0.0, currency: "USDT", status: "UNCONFIGURED" };\n      \n      if (BYBIT_API_KEY && BYBIT_API_SECRET) {', newLiveDataLogic);

// Update /api/account/balance/reset
code = code.replace('demoBalance = 10000;', 'demoBalance = 10000;\n    liveBalance = 50000.0;');
code = code.replace('setDoc(doc(db, "system", "balances"), { demoBalance }', 'setDoc(doc(db, "system", "balances"), { demoBalance, liveBalance }');

fs.writeFileSync('server.ts', code);
