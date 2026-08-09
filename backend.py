import http.server
import json
import os
import sys

PORT = 8000
DATA_FILE = "pocket_settings.json"

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

def run(server_class=http.server.HTTPServer, handler_class=PocketSettingsHandler):
    server_address = ('0.0.0.0', PORT)
    httpd = server_class(server_address, handler_class)
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
