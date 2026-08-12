import re

with open("src/components/PocketSignalsWorkspace.tsx", "r") as f:
    content = f.read()

start_idx = content.find("  // Request Single Pair Custom Signal")
end_idx = content.find("  return (")

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + content[end_idx:]
    with open("src/components/PocketSignalsWorkspace.tsx", "w") as f:
        f.write(content)
    print("Deleted handleRequestSingleSignal")
else:
    print("Could not find boundaries")
