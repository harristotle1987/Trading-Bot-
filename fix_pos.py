import re

with open("server.ts", "r") as f:
    content = f.read()

target = 'const isBuy = pos.side.toUpperCase() === "BUY" || pos.side.toUpperCase() === "LONG";'
replace = 'const isBuy = pos.side && (pos.side.toUpperCase() === "BUY" || pos.side.toUpperCase() === "LONG");'
if target in content:
    content = content.replace(target, replace)
    print("Patched isBuy")
else:
    print("Target not found")

with open("server.ts", "w") as f:
    f.write(content)
