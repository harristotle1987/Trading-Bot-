import re

with open("src/components/PocketSignalsWorkspace.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "direction: 'CALL' | 'PUT';",
    "direction: 'CALL' | 'PUT' | 'NO_TRADE';"
)

replacement = """              mlProbability: record.ml_probability,
              validUntil: record.expiry,
              martingaleStep: "M1"
"""
content = content.replace("              validUntil: record.expiry\n", replacement)

with open("src/components/PocketSignalsWorkspace.tsx", "w") as f:
    f.write(content)
print("Updated")
