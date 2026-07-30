const fs = require('fs');

const filesToFix = [
  'api/account/balances.ts',
  'api/trades/active.ts',
  'api/trades/closed.ts',
  'api/market/prices.ts',
  'lib/firebase-admin.ts'
];

for (const file of filesToFix) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf-8');
  
  const replacement = `
        let serviceAccount;
        try {
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        } catch (err) {
            console.warn("FIREBASE_SERVICE_ACCOUNT is not valid JSON. Ignoring.");
        }
        if (serviceAccount) {
            initializeApp({
                credential: cert(serviceAccount),
            });
        } else {
            initializeApp();
        }
`;
  
  content = content.replace(/const serviceAccount = JSON\.parse\(process\.env\.FIREBASE_SERVICE_ACCOUNT\);\s*initializeApp\(\{\s*credential: cert\(serviceAccount\),\s*\}\);/g, replacement);

  fs.writeFileSync(file, content, 'utf-8');
  console.log(`Fixed JSON parse in ${file}`);
}
