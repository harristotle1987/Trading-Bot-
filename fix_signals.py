import re

with open("src/utils/signalDataset.ts", "r") as f:
    content = f.read()

target1 = 'console.warn("Firestore write failed, falling back to local file storage:", err.message);'
replace1 = """      if (!err.message || !err.message.includes("RESOURCE_EXHAUSTED")) {
        console.warn("Firestore write failed, falling back to local file storage:", err.message);
      }"""
content = content.replace(target1, replace1)

target2 = 'console.warn("Firestore getAll failed, loading from local JSON instead:", err.message);'
replace2 = """      if (!err.message || !err.message.includes("RESOURCE_EXHAUSTED")) {
        console.warn("Firestore getAll failed, loading from local JSON instead:", err.message);
      }"""
content = content.replace(target2, replace2)

with open("src/utils/signalDataset.ts", "w") as f:
    f.write(content)

print("Patched signalDataset")
