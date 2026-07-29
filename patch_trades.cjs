const fs = require('fs');
let code = fs.readFileSync('src/components/TradesManagementPage.tsx', 'utf8');

const target = `    try {
        const tradesRef = doc(db, "system", "trades");
        unsubscribe = onSnapshot(tradesRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.positions) {
                    const active = data.positions.filter((p: any) => p.status === "OPEN");
                    setPositions(active);
                }
            }
            setIsLoading(false);
        });
    } catch (err) {
        console.error("Firebase sync error:", err);
        // Fallback to polling
        fetchPositions();
        const interval = setInterval(fetchPositions, 3000);
        unsubscribe = () => clearInterval(interval);
    }`;

const replacement = `    try {
        const tradesRef = doc(db, "system", "trades");
        unsubscribe = onSnapshot(tradesRef, (docSnap) => {
            if (docSnap.exists()) {
                // We'll also poll continuously so price/PnL updates show up
            }
            setIsLoading(false);
        });
    } catch (err) {
        console.error("Firebase sync error:", err);
    }
    
    // Always poll to get real-time price & PnL updates from server since Firebase is only updated on close
    fetchPositions();
    const interval = setInterval(fetchPositions, 2000);
    
    const oldUnsubscribe = unsubscribe;
    unsubscribe = () => {
        oldUnsubscribe();
        clearInterval(interval);
    };`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/TradesManagementPage.tsx', code);
