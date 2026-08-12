import re

with open("src/components/PocketSignalsWorkspace.tsx", "r") as f:
    content = f.read()

# I see a block duplicated. Let's find the boundaries of the duplication.
multi_idx1 = content.find("  // Multi-strategy configurations")
multi_idx2 = content.find("  // Multi-strategy configurations", multi_idx1 + 1)

print(f"multi_idx1: {multi_idx1}, multi_idx2: {multi_idx2}")
