with open("src/components/PocketSignalsWorkspace.tsx", "r") as f:
    content = f.read()

idx1 = content.find("  // Request Single Pair Custom Signal")
idx2 = content.find("  return (")
print(f"idx1: {idx1}, idx2: {idx2}")
