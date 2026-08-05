const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const activeEndpoint = `app.get("/api/trades/active", async (req, res) => {`;
const newActiveEndpoint = `app.get("/api/trades/active", async (req, res) => {
    if (process.env.VERCEL && db && GLOBAL_POSITIONS.length === 0) {
        try {
            const snap = await getDoc(doc(db, "system", "trades"));
            if (snap.exists() && snap.data().positions) {
                GLOBAL_POSITIONS.splice(0, GLOBAL_POSITIONS.length, ...snap.data().positions);
            }
        } catch(e) {}
    }`;

code = code.replace(activeEndpoint, newActiveEndpoint);

const closedEndpoint = `app.get("/api/trades/closed", (req, res) => {`;
const newClosedEndpoint = `app.get("/api/trades/closed", async (req, res) => {
    if (process.env.VERCEL && db && GLOBAL_POSITIONS.length === 0) {
        try {
            const snap = await getDoc(doc(db, "system", "trades"));
            if (snap.exists() && snap.data().positions) {
                GLOBAL_POSITIONS.splice(0, GLOBAL_POSITIONS.length, ...snap.data().positions);
            }
        } catch(e) {}
    }`;

code = code.replace(closedEndpoint, newClosedEndpoint);
fs.writeFileSync('server.ts', code);
