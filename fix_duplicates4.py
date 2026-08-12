with open("src/components/PocketSignalsWorkspace.tsx", "r") as f:
    content = f.read()

return_idx1 = 16643
multi_idx2 = 17128

print("Text between return_idx1 and multi_idx2:")
print(repr(content[return_idx1:multi_idx2]))
