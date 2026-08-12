import re

with open("src/utils/signalDataset.ts", "r") as f:
    content = f.read()

target = 'console.warn("Firestore update failed, editing local JSON alignment instead:", err.message);'
replace = """      if (!err.message || !err.message.includes("RESOURCE_EXHAUSTED")) {
        console.warn("Firestore update failed, editing local JSON alignment instead:", err.message);
      }"""

if target in content:
    content = content.replace(target, replace)
    print("Patched signalDataset update")
else:
    print("Target not found")

with open("src/utils/signalDataset.ts", "w") as f:
    f.write(content)

