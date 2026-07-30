const fs = require('fs');

const filesToFix = [
  'api/account/balances.ts',
  'api/trades/active.ts',
  'api/trades/closed.ts',
  'api/market/prices.ts',
  'lib/firebase-admin.ts'
];

for (const file of filesToFix) {
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace(/import \* as admin from 'firebase-admin';/g, "import { initializeApp, getApps, cert } from 'firebase-admin/app';\nimport { getFirestore } from 'firebase-admin/firestore';");
  
  content = content.replace(/if \(!admin\.getApps\(\)\.length\) \{/g, "if (!getApps().length) {");
  
  content = content.replace(/admin\.initializeApp\(\{/g, "initializeApp({");
  content = content.replace(/credential: admin\.credential\.cert\(serviceAccount\),/g, "credential: cert(serviceAccount),");
  content = content.replace(/credential: admin\.credential\.applicationDefault\(\),/g, "/* Application default credentials */");
  
  content = content.replace(/const db = admin\.firestore\(\);/g, "const db = getFirestore();");
  content = content.replace(/export const db = admin\.firestore\(\);/g, "export const db = getFirestore();");

  fs.writeFileSync(file, content, 'utf-8');
  console.log(`Fixed TS in ${file}`);
}
