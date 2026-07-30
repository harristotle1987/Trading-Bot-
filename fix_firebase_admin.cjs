const fs = require('fs');

const filesToFix = [
  'api/account/balances.ts',
  'api/trades/active.ts',
  'api/trades/closed.ts',
  'api/market/prices.ts'
];

for (const file of filesToFix) {
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace(/import \* as admin from 'firebase-admin';/g, "import * as admin from 'firebase-admin';");
  content = content.replace(/if \(!admin\.apps\.length\) \{/g, "if (!admin.getApps().length) {");
  fs.writeFileSync(file, content, 'utf-8');
  console.log(`Fixed ${file}`);
}
