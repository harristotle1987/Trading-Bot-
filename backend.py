import http.server
import json
import os
import sys

PORT = 8088
DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pocket_settings.json")

# Load initial settings
def load_settings():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"[Python] Error reading settings: {e}", file=sys.stderr)
    return {
        "lotSize": 1.0,
        "selectedTimeframe": "30m",
        "selectedStrategies": ["DAY_TRADING"],
        "customDocText": "",
        "savedSignals": [],
        "signalGeneratorSettings": {
            "symbol": "EUR/USD",
            "isOtc": False,
            "strategyName": "Day Trading",
            "timeframe": "30m"
        }
    }

# Save settings
def save_settings(data):
    try:
        # Load existing first to merge keys gracefully
        current = load_settings()
        current.update(data)
        with open(DATA_FILE, "w") as f:
            json.dump(current, f, indent=2)
        return True
    except Exception as e:
        print(f"[Python] Error saving settings: {e}", file=sys.stderr)
        return False

class PocketSettingsHandler(http.server.BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        if self.path == "/load" or self.path == "/api/pocket-option/load-settings":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            
            settings = load_settings()
            self.wfile.write(json.dumps(settings).encode("utf-8"))
        elif self.path == "/stats" or self.path == "/api/pocket-option/stats":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            
            settings = load_settings()
            saved_count = len(settings.get("savedSignals", []))
            stats = {
                "status": "online",
                "backend": "Python 3.11 BaseHTTPRequestHandler",
                "data_file": DATA_FILE,
                "saved_signals_count": saved_count,
                "current_lot_size": settings.get("lotSize", 1.0),
                "current_timeframe": settings.get("selectedTimeframe", "30m"),
                "last_signal_generated": settings.get("signalGeneratorSettings", {}).get("generatedAt", "N/A")
            }
            self.wfile.write(json.dumps(stats).encode("utf-8"))
        elif self.path == "/export" or self.path == "/api/pocket-option/export":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Disposition", 'attachment; filename="pocket_option_audit_export.json"')
            self._send_cors_headers()
            self.end_headers()
            
            settings = load_settings()
            export_payload = {
                "system": "Pocket Option AI Trading Engine",
                "exportedAt": str(os.popen("date").read()).strip(),
                "lotSize": settings.get("lotSize", 1.0),
                "timeframe": settings.get("selectedTimeframe", "30m"),
                "activeStrategies": settings.get("selectedStrategies", []),
                "savedSignals": settings.get("savedSignals", []),
                "lastSignalGenerator": settings.get("signalGeneratorSettings", {})
            }
            self.wfile.write(json.dumps(export_payload, indent=2).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == "/save" or self.path == "/api/pocket-option/save-settings":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode("utf-8"))
                success = save_settings(data)
                
                self.send_response(200 if success else 500)
                self.send_header("Content-Type", "application/json")
                self._send_cors_headers()
                self.end_headers()
                
                response = {"status": "success" if success else "error", "saved": data}
                self.wfile.write(json.dumps(response).encode("utf-8"))
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

class ReusableHTTPServer(http.server.HTTPServer):
    allow_reuse_address = True

def run():
    server_address = ('0.0.0.0', PORT)
    try:
        httpd = ReusableHTTPServer(server_address, PocketSettingsHandler)
    except OSError as e:
        if getattr(e, 'errno', None) == 98 or "Address already in use" in str(e):
            print(f"[Python] Settings backend port {PORT} already bound/in use. Reusing active backend process.", flush=True)
            sys.exit(0)
        else:
            raise e

    print(f"[Python] Settings backend listening on port {PORT}...", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
        print("[Python] Server stopped.", flush=True)

if __name__ == "__main__":
    run()
