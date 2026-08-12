async function testEndpoint(method, path, body = null) {
  const url = `https://trading-bot-ten-rho.vercel.app${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, options);
    const data = await res.text();
    let statusStr = res.status.toString();
    let pass = (res.ok || res.status === 400 || res.status === 401 || res.status === 404) ? 'PASS' : 'FAIL';
    
    // We do not accept 500 errors.
    if (res.status >= 500) pass = 'FAIL';
    
    console.log(`METHOD: ${method.padEnd(6)} URL: ${path.padEnd(40)} STATUS: ${statusStr} PASS/FAIL: ${pass}`);
    if (pass === 'FAIL') {
      console.log(`  Response: ${data.substring(0, 100)}...`);
    }
  } catch (err) {
    console.log(`METHOD: ${method.padEnd(6)} URL: ${path.padEnd(40)} STATUS: ERROR PASS/FAIL: FAIL`);
    console.log(`  Error: ${err.message}`);
  }
}

async function runAll() {
  console.log("Starting API regression tests for PROD...");
  
  const endpoints = [
    { method: "GET", path: "/api/health" },
    { method: "GET", path: "/api/system/health" },
    { method: "GET", path: "/api/pwa/version" },
    { method: "GET", path: "/api/paper/stats" },
    { method: "GET", path: "/api/account/balances" },
    { method: "POST", path: "/api/account/balance/reset" },
    { method: "GET", path: "/api/risk/settings" },
    { method: "POST", path: "/api/risk/settings", body: { risk: 1 } },
    { method: "GET", path: "/api/risk/metrics" },
    { method: "GET", path: "/api/execution/positions" },
    { method: "GET", path: "/api/execution/orders" },
    { method: "POST", path: "/api/execution/order/create", body: { symbol: "BTCUSDT", direction: "BUY", amount: 100 } },
    { method: "POST", path: "/api/execution/position/close/BTCUSDT" },
    { method: "POST", path: "/api/execution/order/cancel/123" },
    { method: "POST", path: "/api/agent/start" },
    { method: "POST", path: "/api/agent/pause" },
    { method: "POST", path: "/api/agent/stop" },
    { method: "POST", path: "/api/agent/kill-switch" },
    { method: "GET", path: "/api/agent/status" },
    { method: "POST", path: "/api/agent/strategy-sweep", body: {} },
    { method: "GET", path: "/api/agent/strategy-sweep/latest" },
    { method: "GET", path: "/api/sentiment/latest/BTCUSDT" },
    { method: "GET", path: "/api/sentiment/macro-calendar" },
    { method: "POST", path: "/api/agent/forensics", body: {} },
    { method: "GET", path: "/api/config/keys" },
    { method: "POST", path: "/api/config/keys", body: {} },
    { method: "GET", path: "/api/ai/finnhub-news" },
    { method: "POST", path: "/api/ai/evaluate-pair", body: { symbol: "BTCUSDT" } },
    { method: "GET", path: "/api/agent-workspace/scan" },
    { method: "GET", path: "/api/pocket-option/load-settings" },
    { method: "POST", path: "/api/pocket-option/save-settings", body: {} },
    { method: "GET", path: "/api/pocket-option/stats" },
    { method: "GET", path: "/api/pocket-option/export" },
    { method: "GET", path: "/api/signals/active" },
    { method: "GET", path: "/api/agent-workspace/demo/account" },
    { method: "POST", path: "/api/agent-workspace/demo/place-order", body: {} },
    { method: "POST", path: "/api/agent-workspace/live/place-order", body: {} },
    { method: "GET", path: "/api/trades/active" },
    { method: "GET", path: "/api/trades/closed" },
    { method: "POST", path: "/api/trades/execute", body: {} },
    { method: "POST", path: "/api/trades/close", body: {} },
    { method: "GET", path: "/api/health/diagnostics" },
    { method: "POST", path: "/api/ai/transcripts/ingest", body: {} },
    { method: "GET", path: "/api/system/audit-logs" },
    { method: "POST", path: "/api/system/maintenance-mode", body: {} },
    { method: "POST", path: "/api/system/reset", body: {} },
    { method: "POST", path: "/api/backtest/run", body: {} },
    { method: "POST", path: "/api/backtest/walk-forward", body: {} },
    { method: "GET", path: "/api/backtest/reports" },
    { method: "GET", path: "/api/backtest/reports/123" },
    { method: "POST", path: "/api/snapshots", body: {} },
    { method: "POST", path: "/api/ml/train", body: {} },
    { method: "GET", path: "/api/ml/models" },
    { method: "POST", path: "/api/ml/rollback", body: {} },
    { method: "GET", path: "/api/ml/stats" },
    { method: "GET", path: "/api/market/prices" },
    { method: "GET", path: "/api/snapshots" },
    { method: "GET", path: "/api/market/kline" }
  ];

  for (const ep of endpoints) {
    await testEndpoint(ep.method, ep.path, ep.body);
  }
  
  console.log("Done PROD testing.");
}

runAll();
