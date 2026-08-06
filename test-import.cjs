const fs = require('fs');
let code = fs.readFileSync('src/hooks/useRealtimeData.ts', 'utf8');
code = code.replace("import Pusher from 'pusher-js';", "import { pusherClient } from '../lib/pusher';");
fs.writeFileSync('src/hooks/useRealtimeData.ts', code);
