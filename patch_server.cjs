const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace("import Pusher from 'pusher';", "import { pusherServer as pusher } from './src/lib/pusher.js';");
code = code.replace(/const pusher = process\.env\.PUSHER_APP_ID \? new Pusher\(\{.*?\}\) : null;/s, "");
fs.writeFileSync('server.ts', code);
