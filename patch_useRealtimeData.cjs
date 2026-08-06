const fs = require('fs');
let code = fs.readFileSync('src/hooks/useRealtimeData.ts', 'utf8');

code = code.replace(
  "import Pusher from 'pusher-js';",
  "import { pusherClient as pusherInstance } from '../lib/pusher';"
);

code = code.replace(
  "let pusherInstance: Pusher | null = null;",
  ""
);

code = code.replace(
  /if \(!pusherInstance && import\.meta\.env\.VITE_PUSHER_KEY && import\.meta\.env\.VITE_PUSHER_CLUSTER\) \{[\s\S]*?pusherInstance = new Pusher\([\s\S]*?\}\);/,
  "if (pusherInstance) {"
);

fs.writeFileSync('src/hooks/useRealtimeData.ts', code);
