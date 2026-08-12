const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Move import { adminAuth } from "./src/lib/firebase"; to top
content = content.replace('import { adminAuth } from "./src/lib/firebase";\n', '');
content = content.replace('import { adminDb as db, initFirebaseAdmin } from "./src/lib/firebase";', 'import { adminDb as db, adminAuth, initFirebaseAdmin } from "./src/lib/firebase";');

fs.writeFileSync('server.ts', content);
