with open("src/components/PocketSignalsWorkspace.tsx", "r") as f:
    content = f.read()

multi_idx1 = content.find("  // Multi-strategy configurations")
multi_idx2 = content.find("  // Multi-strategy configurations", multi_idx1 + 1)

print("idx1:")
print(repr(content[multi_idx1:multi_idx1+200]))

print("idx2:")
print(repr(content[multi_idx2:multi_idx2+200]))

return_idx1 = content.find("  return (", multi_idx1)
return_idx2 = content.find("  return (", multi_idx2)

print(f"return_idx1: {return_idx1}, return_idx2: {return_idx2}")
