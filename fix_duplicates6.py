with open("src/components/PocketSignalsWorkspace.tsx", "r") as f:
    content = f.read()

bad_str = """  return () => clearTimeout(timer);
  }, [lotSize, selectedTimeframe, selectedStrategyIds, minWinRate, selectedAssetType, hasLoadedSettings, saveToPythonBackend]);

"""
if bad_str in content:
    content = content.replace(bad_str, "")
    with open("src/components/PocketSignalsWorkspace.tsx", "w") as f:
        f.write(content)
    print("Fixed floating code!")
else:
    print("Could not find floating code")
    print(repr(content[16500:17500]))
