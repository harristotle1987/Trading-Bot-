import crypto from "crypto";

async function run() {
  const BYBIT_API_KEY = process.env.BYBIT_API_KEY;
  const BYBIT_API_SECRET = process.env.BYBIT_API_SECRET;
  const BYBIT_BASE_URL = "https://api.bybit.com";
  
  const endpoint = "/v5/account/wallet-balance";
  const recvWindow = "5000";
  const timestamp = Date.now().toString();
  const paramsStr = "accountType=UNIFIED";
  
  const rawPayload = timestamp + BYBIT_API_KEY + recvWindow + paramsStr;
  const signature = crypto.createHmac("sha256", BYBIT_API_SECRET).update(rawPayload).digest("hex");
  
  const url = `${BYBIT_BASE_URL}${endpoint}?${paramsStr}`;
  const response = await fetch(url, {
      headers: {
          "X-BAPI-API-KEY": BYBIT_API_KEY,
          "X-BAPI-SIGN": signature,
          "X-BAPI-TIMESTAMP": timestamp,
          "X-BAPI-RECV-WINDOW": recvWindow
      }
  });
  console.log("Status:", response.status);
  console.log("Body:", await response.text());
}
run();
