import sys
import json
from app.agent.deep_forensics import run_deep_forensics_scan

if __name__ == "__main__":
    try:
        input_data = sys.argv[1]
        market_data = json.loads(input_data)
        result = run_deep_forensics_scan(market_data)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
