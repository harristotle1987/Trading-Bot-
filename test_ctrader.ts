import { CTraderConnection } from "@reiryoku/ctrader-layer";
async function run() {
    try {
        const accounts = await CTraderConnection.getAccessTokenAccounts("test");
        console.log(accounts);
    } catch(e) {
        console.error(e.message);
    }
}
run();
