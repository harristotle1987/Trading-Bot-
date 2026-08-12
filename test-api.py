import urllib.request
import urllib.error
import json
import sys

endpoints = [
    ("GET", "/api/health", None),
    ("GET", "/api/system/health", None),
    ("GET", "/api/pwa/version", None),
    ("GET", "/api/paper/stats", None),
    ("GET", "/api/account/balances", None),
    ("POST", "/api/account/balance/reset", {}),
    ("GET", "/api/risk/settings", None),
    ("POST", "/api/risk/settings", {"risk": 1}),
    ("GET", "/api/risk/metrics", None),
    ("GET", "/api/execution/positions", None),
    ("GET", "/api/execution/orders", None),
    ("POST", "/api/execution/order/create", {"symbol": "BTCUSDT", "direction": "BUY", "amount": 100}),
    ("POST", "/api/execution/position/close/BTCUSDT", {}),
    ("POST", "/api/execution/order/cancel/123", {}),
    ("POST", "/api/agent/start", {}),
    ("POST", "/api/agent/pause", {}),
    ("POST", "/api/agent/stop", {}),
    ("POST", "/api/agent/kill-switch", {}),
    ("GET", "/api/agent/status", None),
    ("POST", "/api/agent/strategy-sweep", {}),
    ("GET", "/api/agent/strategy-sweep/latest", None),
    ("GET", "/api/sentiment/latest/BTCUSDT", None),
    ("GET", "/api/sentiment/macro-calendar", None),
    ("POST", "/api/agent/forensics", {}),
    ("GET", "/api/config/keys", None),
    ("POST", "/api/config/keys", {}),
    ("GET", "/api/ai/finnhub-news", None),
    ("POST", "/api/ai/evaluate-pair", {"symbol": "BTCUSDT"}),
    ("GET", "/api/agent-workspace/scan", None),
    ("GET", "/api/pocket-option/load-settings", None),
    ("POST", "/api/pocket-option/save-settings", {}),
    ("GET", "/api/pocket-option/stats", None),
    ("GET", "/api/pocket-option/export", None),
    ("GET", "/api/signals/active", None),
    ("GET", "/api/agent-workspace/demo/account", None),
    ("POST", "/api/agent-workspace/demo/place-order", {}),
    ("POST", "/api/agent-workspace/live/place-order", {}),
    ("GET", "/api/trades/active", None),
    ("GET", "/api/trades/closed", None),
    ("POST", "/api/trades/execute", {}),
    ("POST", "/api/trades/close", {}),
    ("GET", "/api/health/diagnostics", None),
    ("POST", "/api/ai/transcripts/ingest", {"title": "test", "transcript_text": "test"}),
    ("GET", "/api/system/audit-logs", None),
    ("POST", "/api/system/maintenance-mode", {}),
    ("POST", "/api/system/reset", {}),
    ("POST", "/api/backtest/run", {}),
    ("POST", "/api/backtest/walk-forward", {}),
    ("GET", "/api/backtest/reports", None),
    ("GET", "/api/backtest/reports/123", None),
    ("POST", "/api/snapshots", {}),
    ("POST", "/api/ml/train", {}),
    ("GET", "/api/ml/models", None),
    ("POST", "/api/ml/rollback", {}),
    ("GET", "/api/ml/stats", None),
    ("GET", "/api/market/prices", None),
    ("GET", "/api/snapshots", None),
    ("GET", "/api/market/kline?symbol=BTCUSDT&interval=5", None)
]

base_url = "http://127.0.0.1:3000"

for method, path, body in endpoints:
    url = base_url + path
    req = urllib.request.Request(url, method=method)
    if body is not None:
        req.add_header('Content-Type', 'application/json')
        req.data = json.dumps(body).encode('utf-8')
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            status = res.status
            pass_fail = "PASS" if status < 500 else "FAIL"
            print(f"METHOD: {method.ljust(6)} URL: {path.ljust(40)} STATUS: {status} PASS/FAIL: {pass_fail}")
            sys.stdout.flush()
    except urllib.error.HTTPError as e:
        status = e.code
        pass_fail = "PASS" if status < 500 else "FAIL"
        print(f"METHOD: {method.ljust(6)} URL: {path.ljust(40)} STATUS: {status} PASS/FAIL: {pass_fail}")
        sys.stdout.flush()
    except Exception as e:
        print(f"METHOD: {method.ljust(6)} URL: {path.ljust(40)} STATUS: ERROR PASS/FAIL: FAIL")
        print(f"  Error: {e}")
        sys.stdout.flush()

