with open("src/components/PocketSignalsWorkspace.tsx", "r") as f:
    content = f.read()

target = """    const timer = setTimeout(() => {
      saveToPythonBackend(false);
    }, 400);"""

replacement = """    const timer = setTimeout(() => {
      saveToPythonBackend(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [lotSize, selectedTimeframe, selectedStrategyIds, minWinRate, selectedAssetType, hasLoadedSettings, saveToPythonBackend]);"""

if target in content:
    content = content.replace(target, replacement, 1)
    with open("src/components/PocketSignalsWorkspace.tsx", "w") as f:
        f.write(content)
    print("Fixed useEffect closing")
else:
    print("Target not found")
