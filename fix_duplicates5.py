with open("src/components/PocketSignalsWorkspace.tsx", "r") as f:
    content = f.read()

multi_idx2 = content.find("  // Multi-strategy configurations", 11000)

if multi_idx2 != -1:
    print("Found multi_idx2 at", multi_idx2)
    # What's between multi_idx1 and multi_idx2?
    print("Between multi_idx1 and multi_idx2 length:", multi_idx2 - 10944)
    # Let's see the context around multi_idx2
    # Where does the duplicate end?
    end_of_duplicate = content.find("  const filteredSignals = signals", multi_idx2)
    if end_of_duplicate != -1:
        print("Found end_of_duplicate at", end_of_duplicate)
        # Let's just delete from multi_idx2 to end_of_duplicate
        content = content[:multi_idx2] + content[end_of_duplicate:]
        with open("src/components/PocketSignalsWorkspace.tsx", "w") as f:
            f.write(content)
        print("Deleted duplicate!")
    else:
        print("Could not find end of duplicate")

