import re

with open("server.ts", "r") as f:
    content = f.read()

target = 'console.error("Failed to fetch market price", e);'
replace = 'console.warn("Failed to fetch market price, using fallback", e.message);'
if target in content:
    content = content.replace(target, replace)
    print("Patched market price error")
else:
    print("Target not found for market price")

target2 = 'console.error("Failed to fetch cTrader accounts:", res.statusText);'
replace2 = 'console.warn("Failed to fetch cTrader accounts, ignoring.", res.statusText);'
if target2 in content:
    content = content.replace(target2, replace2)
    print("Patched ctrader error")
else:
    print("Target not found for ctrader")

with open("server.ts", "w") as f:
    f.write(content)
