const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

code = code.replace(/import \* as admin from 'firebase-admin';/, "import { initializeApp, getApps, getApp, cert, applicationDefault } from 'firebase-admin/app';");
code = code.replace(/admin\.getApps\(\)/g, "getApps()");
code = code.replace(/admin\.credential\.cert/g, "cert");
code = code.replace(/admin\.credential\.applicationDefault/g, "applicationDefault");
code = code.replace(/admin\.initializeApp/g, "initializeApp");
code = code.replace(/admin\.app\(\)/g, "getApp()");

code = code.replace(/export const adminAuth = admin\.auth\(\);/, "import { getAuth } from 'firebase-admin/auth';\nexport const adminAuth = getAuth(getApp());");

fs.writeFileSync('src/lib/firebase.ts', code);
