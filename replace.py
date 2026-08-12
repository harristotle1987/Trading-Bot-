import re

with open("server.ts", "r") as f:
    content = f.read()

# We want to replace from app.get("/api/pocket-option/signals"
# up to the end of app.post("/api/pocket-option/generate-signal"

start_idx = content.find('app.get("/api/pocket-option/signals", async (req, res) => {')
end_idx = content.find('app.get("/api/agent-workspace/demo/account", (req, res) => {')

if start_idx != -1 and end_idx != -1:
    replacement = """  app.get("/api/signals/active", async (req, res) => {
    try {
      const allSignals = await getAllSignals();
      const activeSignals = allSignals.filter(s => s.outcome === SignalOutcome.UNRESOLVED);
      res.json(activeSignals);
    } catch (err) {
      console.error("Error fetching active signals:", err);
      res.status(500).json({ error: "Failed to fetch active signals" });
    }
  });

"""
    new_content = content[:start_idx] + replacement + content[end_idx:]
    with open("server.ts", "w") as f:
        f.write(new_content)
    print("Replaced successfully.")
else:
    print(f"Indices not found: start_idx={start_idx}, end_idx={end_idx}")

