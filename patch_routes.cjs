const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// We want to make sure app handles requests after initialization.
// A good pattern is to create an async initialization, but export the app immediately.
// We can intercept requests with a middleware that waits for initialization!

let patch = `
let initialized = false;
let initPromise = null;

app.use(async (req, res, next) => {
  if (!initialized) {
    if (!initPromise) {
      initPromise = startServer();
    }
    await initPromise;
    initialized = true;
  }
  next();
});

export default app;
`;
// Let's just append this logic! Wait, if we append this, the routes are already attached to app inside startServer.
