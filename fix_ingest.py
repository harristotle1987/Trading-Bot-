import re

with open("server.ts", "r") as f:
    content = f.read()

target = """      } catch (e: any) {
          console.error("Failed to query NVIDIA NIM API:", e);
          res.status(500).json({ status: "FAILED", reason: e.message });
      }"""
replace = """      } catch (e: any) {
          console.warn("Failed to query NVIDIA NIM API, falling back to simulated data", e.message);
          res.json({
            status: "SIMULATED",
            title: title,
            rules: {
                core_rules: ["(Simulated) Wait for VWAP cross", "(Simulated) Enter on EMA 9/20 convergence"],
                risk_filters: ["(Simulated) Do not trade during high impact news"],
                priority_setups: ["(Simulated) Golden Fibonacci Retracement"]
            }
          });
      }"""

if target in content:
    content = content.replace(target, replace)
    print("Patched ingest catch")
else:
    print("Target not found for ingest")

with open("server.ts", "w") as f:
    f.write(content)
