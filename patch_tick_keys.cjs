const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

const tickTarget = 'app.all("/api/engine/tick", async (req, res) => {';
const tickReplace = 'app.all("/api/engine/tick", async (req, res) => {\n      await loadKeysFromFirestore();';
content = content.replace(tickTarget, tickReplace);

// Also patch anywhere else that uses APIs dynamically without waiting
// For example: app.post("/api/trades/execute"
// Let's just make a global middleware that awaits loadKeysFromFirestore!
// Wait, we can't easily do that if loadKeysFromFirestore is defined later.
// Let's move loadKeysFromFirestore definition to the top (or make it hoisted by defining it as function).

// Actually, instead of replacing individual routes, let's just make it a middleware!
const targetLoader = `  let keysLoaded = false;
  const loadKeysFromFirestore = async () => {`;
const replaceLoader = `  let keysLoaded = false;
  async function loadKeysFromFirestore() {`;
content = content.replace(targetLoader, replaceLoader);

const authMiddlewareTarget = `app.use("/api", requireAuth);`;
const authMiddlewareReplace = `app.use("/api", async (req, res, next) => {
    if (typeof loadKeysFromFirestore === "function") {
        await loadKeysFromFirestore();
    }
    next();
});\napp.use("/api", requireAuth);`;
content = content.replace(authMiddlewareTarget, authMiddlewareReplace);

fs.writeFileSync('server.ts', content);
console.log('Keys loader middleware added');
