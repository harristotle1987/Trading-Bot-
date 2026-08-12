import re

with open("src/components/PocketSignalsWorkspace.tsx", "r") as f:
    content = f.read()

# 1. Remove getFallbackSignals
idx1 = content.find("  const getFallbackSignals = useCallback((): PocketSignal[] => {")
end_idx1 = content.find("  const saveSettings = useCallback(async (manual: boolean) => {")
if end_idx1 == -1:
    end_idx1 = content.find("  // Fetch Signals from Backend")
content = content[:idx1] + content[end_idx1:]

# 2. Rewrite fetchSignals
idx2 = content.find("  const fetchSignals = useCallback(async (isManualTrigger = false) => {")
end_idx2 = content.find("  useEffect(() => {", idx2)

fetch_code = """  const fetchSignals = useCallback(async (isManualTrigger = false) => {
    if (isManualTrigger) setLoading(true);
    try {
      const res = await fetch('/api/signals/active', { cache: 'no-store' });
      if (res.ok) {
        const records = await res.json();
        
        if (Array.isArray(records)) {
          const mappedData: PocketSignal[] = records.map((record: any) => {
            return {
              id: record.signal_id,
              symbol: record.symbol,
              isOtc: record.symbol.endsWith("-OTC"),
              category: (record.symbol.includes("USDT") || record.symbol.includes("BTC")) ? 'crypto' : (record.symbol.length === 6 && !record.symbol.includes("USDT") ? 'forex' : 'stocks'),
              direction: record.direction === 'BUY' ? 'CALL' : (record.direction === 'SELL' ? 'PUT' : 'NO_TRADE') as any,
              expiry: record.timeframe, 
              entryPrice: record.entry,
              currentPrice: record.entry,
              winRate: record.signal_score || 80,
              payoutPct: record.payout || 85,
              confidence: (record.signal_score || 80) > 90 ? 'ULTRA_ACCURATE' : 'HIGH_CONFLUENCE',
              strategyUsed: 'Unified Strategy Ensemble',
              indicators: [],
              createdAt: record.timestamp,
              expiryTimestamp: record.expiry,
              status: record.outcome === 'UNRESOLVED' ? 'ACTIVE' : (record.outcome === 'WIN' ? 'EXPIRED_WIN' : 'EXPIRED_LOSS'),
              signalScore: record.signal_score,
              expectedValue: record.expected_value,
              strategyAgreement: record.strategy_agreement,
              marketRegime: record.market_regime,
              mlProbability: record.ml_probability,
              validUntil: record.expiry
            };
          });
          
          setSignals(mappedData);
          if (isManualTrigger) {
            toast.success(`Canonical signals loaded successfully.`);
          }
        }
      }
    } catch (err) {
      console.warn('Signal fetch failed:', err);
    } finally {
      if (isManualTrigger) setLoading(false);
    }
  }, []);

"""
content = content[:idx2] + fetch_code + content[end_idx2:]

# 3. Remove handleRequestSingleSignal
idx3 = content.find("  // Request Single Pair Custom Signal")
end_idx3 = content.find("  return (")
content = content[:idx3] + content[end_idx3:]

with open("src/components/PocketSignalsWorkspace.tsx", "w") as f:
    f.write(content)
print("Updated basic logic")
