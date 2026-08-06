const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

code = code.replace(/import admin from "firebase-admin";/, "import * as admin from 'firebase-admin';");

fs.writeFileSync('src/lib/firebase.ts', code);
