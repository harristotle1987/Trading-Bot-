import re

with open("server.ts", "r") as f:
    content = f.read()

target = 'signal: AbortSignal.timeout(10000)'
replace = 'signal: AbortSignal.timeout(3000)'
if target in content:
    content = content.replace(target, replace)
    print("Patched timeouts")
else:
    print("Target not found")

with open("server.ts", "w") as f:
    f.write(content)
