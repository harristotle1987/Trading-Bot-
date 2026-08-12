import re

with open("server.ts", "r") as f:
    content = f.read()

target = 'console.warn("NVIDIA API endpoint error in evaluate-pair:", err);'
replace = 'console.warn("NVIDIA API endpoint timeout in evaluate-pair, using fallback", err.message);'
if target in content:
    content = content.replace(target, replace)
    print("Patched evaluate-pair warn")
else:
    print("Target not found for evaluate-pair warn")

with open("server.ts", "w") as f:
    f.write(content)
