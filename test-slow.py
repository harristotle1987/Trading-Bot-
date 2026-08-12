import urllib.request
import urllib.error
import json
import sys

endpoints = [
    ("POST", "/api/ai/evaluate-pair", {"symbol": "BTCUSDT"}),
    ("POST", "/api/ai/transcripts/ingest", {"text": "hello"}),
    ("GET", "/api/market/kline?symbol=BTCUSDT", None)
]

base_url = "https://trading-bot-ten-rho.vercel.app"

for method, path, body in endpoints:
    url = base_url + path
    req = urllib.request.Request(url, method=method)
    if body is not None:
        req.add_header('Content-Type', 'application/json')
        req.data = json.dumps(body).encode('utf-8')
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
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

