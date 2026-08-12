with open("src/components/PocketSignalsWorkspace.tsx", "r") as f:
    content = f.read()

# Fix multiple mlProbability
if "              mlProbability: record.ml_probability,\n              mlProbability: record.ml_probability," in content:
    content = content.replace("              mlProbability: record.ml_probability,\n              mlProbability: record.ml_probability,", "              mlProbability: record.ml_probability,")
    print("Fixed mlProbability")

# Bring back getProgressPct, formatCountdown, handleCopySignal
helpers = """
  // Helper: Format countdown from MS
  const formatCountdown = (expiryTimeMs: number) => {
    const diff = expiryTimeMs - nowTimestamp;
    if (diff <= 0) return '00:00';
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Helper: Progress Bar Pct
  const getProgressPct = (createdAt: number, expiryAt: number) => {
    const total = expiryAt - createdAt;
    const elapsed = nowTimestamp - createdAt;
    if (total <= 0) return 100;
    const pct = (elapsed / total) * 100;
    return Math.min(Math.max(pct, 0), 100);
  };

  // Helper: Copy signal details
  const handleCopySignal = (sig: PocketSignal) => {
    const text = `🎯 POCKET OPTION SIGNAL\\n\\nSymbol: ${sig.symbol}\\nDirection: ${sig.direction}\\nTimeframe: ${sig.expiry}\\nEntry: ${sig.entryPrice}\\n\\nStrategy: ${sig.strategyUsed}`;
    navigator.clipboard.writeText(text);
    toast.success("Signal Copied to Clipboard!");
  };

"""

# Insert helpers right before return (
ret_idx = content.find("  return (\n    <div className=\"space-y-6 pb-12 w-full max-w-7xl mx-auto\">")
if ret_idx != -1:
    content = content[:ret_idx] + helpers + content[ret_idx:]
    print("Inserted helpers")

with open("src/components/PocketSignalsWorkspace.tsx", "w") as f:
    f.write(content)
