const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const target = 'let firestoreDisabled = false;';
content = content.replace(target, '');
content = content.replace('const app = express();', 'let firestoreDisabled = false;\nconst app = express();');

fs.writeFileSync('server.ts', content);
console.log('Hoisted firestoreDisabled');
