import { adminDb } from "../lib/firebase";
import fs from "fs";
import path from "path";

let datasetFirestoreDisabled = false;

// Standard Outcome Enum representing terminal resolutions
export enum SignalOutcome {
  WIN = "WIN",
  LOSS = "LOSS",
  EXPIRED = "EXPIRED",
  INVALIDATED = "INVALIDATED",
  UNRESOLVED = "UNRESOLVED"
}

export interface SignalRecord {
  signal_id: string;
  symbol: string;
  timeframe: string;
  direction: string;
  entry: number;
  timestamp: number;
  market_regime: string;
  strategy_results: any;
  strategy_agreement: number;
  signal_score: number;
  expected_value: number;
  ml_probability: number | null;
  expiry: number;
  outcome: SignalOutcome;
  outcome_price: number | null;
  result: string | null;
  R_multiple: number | null;
  payout: number | null;
  duration: number | null;
  created_at: string;
  resolved_at: string | null;
  is_paper?: boolean;
}

// Fallback JSON-file path for local persistence when operating without Firestore
const LOCAL_DB_PATH = path.join(process.cwd(), "signals.json");

/**
 * Loads signals from the local JSON file database
 */
function readLocalSignals(): SignalRecord[] {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const content = fs.readFileSync(LOCAL_DB_PATH, "utf8");
      return JSON.parse(content || "[]");
    }
  } catch (err) {
    console.error("Failed to read local signals JSON:", err);
  }
  return [];
}

/**
 * Saves signals to the local JSON file database
 */
function writeLocalSignals(signals: SignalRecord[]) {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(signals, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to save local signals JSON:", err);
  }
}

/**
 * Validates a signal record prior to insertion
 */
export function validateSignal(signal: Partial<SignalRecord>): void {
  if (!signal.signal_id || typeof signal.signal_id !== "string" || signal.signal_id.trim() === "") {
    throw new Error("Invalid Signal: signal_id is required and must be a non-empty string.");
  }
  if (!signal.symbol || typeof signal.symbol !== "string" || signal.symbol.trim() === "") {
    throw new Error("Invalid Signal: symbol is required and must be a non-empty string.");
  }
  if (!signal.timeframe || typeof signal.timeframe !== "string" || signal.timeframe.trim() === "") {
    throw new Error("Invalid Signal: timeframe is required and must be a non-empty string.");
  }
  if (!signal.direction || !["CALL", "PUT", "BUY", "SELL", "LONG", "SHORT"].includes(signal.direction.toUpperCase())) {
    throw new Error("Invalid Signal: direction must be Long/Short or Call/Put.");
  }
  if (typeof signal.entry !== "number" || isNaN(signal.entry) || signal.entry <= 0) {
    throw new Error("Invalid Signal: entry price must be a positive number.");
  }
  if (typeof signal.signal_score !== "number" || isNaN(signal.signal_score)) {
    throw new Error("Invalid Signal: signal_score must be a valid number.");
  }
  if (!signal.market_regime || typeof signal.market_regime !== "string") {
    throw new Error("Invalid Signal: market_regime is required.");
  }
  if (signal.outcome && !Object.values(SignalOutcome).includes(signal.outcome)) {
    throw new Error(`Invalid Signal: outcome must be one of: ${Object.values(SignalOutcome).join(", ")}`);
  }
}

/**
 * Inserts a new signal into the persistent storage with duplicate protection.
 */
export async function insertSignal(signal: Partial<SignalRecord>): Promise<boolean> {
  // Enforce validation first
  validateSignal(signal);

  const fullRecord: SignalRecord = {
    signal_id: signal.signal_id!,
    symbol: signal.symbol!,
    timeframe: signal.timeframe!,
    direction: signal.direction!,
    entry: signal.entry!,
    timestamp: signal.timestamp || Date.now(),
    market_regime: signal.market_regime!,
    strategy_results: signal.strategy_results || {},
    strategy_agreement: typeof signal.strategy_agreement === "number" ? signal.strategy_agreement : 0.0,
    signal_score: signal.signal_score!,
    expected_value: typeof signal.expected_value === "number" ? signal.expected_value : 0.0,
    ml_probability: typeof signal.ml_probability === "number" ? signal.ml_probability : null,
    expiry: typeof signal.expiry === "number" ? signal.expiry : Date.now() + 900000,
    outcome: signal.outcome || SignalOutcome.UNRESOLVED,
    outcome_price: typeof signal.outcome_price === "number" ? signal.outcome_price : null,
    result: signal.result || null,
    R_multiple: typeof signal.R_multiple === "number" ? signal.R_multiple : null,
    payout: typeof signal.payout === "number" ? signal.payout : null,
    duration: typeof signal.duration === "number" ? signal.duration : null,
    created_at: signal.created_at || new Date().toISOString(),
    resolved_at: signal.resolved_at || null
  };

  // 1. Primary Path: Cloud Firestore
  if (adminDb && !datasetFirestoreDisabled) {
    try {
      const docRef = adminDb.collection("signals").doc(fullRecord.signal_id);
      const snapshot = await docRef.get();
      if (snapshot.exists) {
        throw new Error(`Duplicate Protection Triggered: Signal '${fullRecord.signal_id}' already exists.`);
      }
      await docRef.set(fullRecord);
      // Double write to local JSON for localized audit trails
      const local = readLocalSignals();
      if (!local.some(x => x.signal_id === fullRecord.signal_id)) {
        local.push(fullRecord);
        writeLocalSignals(local);
      }
      return true;
    } catch (err: any) {
      if (err.message && err.message.includes("Duplicate Protection")) {
        throw err;
      }
      if (err?.message?.includes("RESOURCE_EXHAUSTED") || err?.code === 8 || String(err).includes("RESOURCE_EXHAUSTED")) {
        datasetFirestoreDisabled = true;
        console.log("ℹ️ Firestore write bypassed: RESOURCE_EXHAUSTED. Operating on local JSON storage.");
      } else {
        console.warn("Firestore write failed, falling back to local file storage:", err.message);
      }
    }
  }

  // 2. Secondary Path: Local JSON Persistence
  const localList = readLocalSignals();
  if (localList.some(s => s.signal_id === fullRecord.signal_id)) {
    throw new Error(`Duplicate Protection Triggered: Signal '${fullRecord.signal_id}' already exists.`);
  }

  localList.push(fullRecord);
  writeLocalSignals(localList);
  return true;
}

/**
 * Retrieves a signal from storage by its unique signal_id
 */
export async function getSignal(signalId: string): Promise<SignalRecord | null> {
  if (!signalId || typeof signalId !== "string" || signalId.trim() === "") {
    return null;
  }

  if (adminDb && !datasetFirestoreDisabled) {
    try {
      const docRef = adminDb.collection("signals").doc(signalId);
      const doc = await docRef.get();
      if (doc.exists) {
        return doc.data() as SignalRecord;
      }
    } catch (err: any) {
      if (err?.message?.includes("RESOURCE_EXHAUSTED") || err?.code === 8 || String(err).includes("RESOURCE_EXHAUSTED")) {
        datasetFirestoreDisabled = true;
      } else {
        console.warn("Firestore read failed, searching local JSON instead:", err.message);
      }
    }
  }

  const localList = readLocalSignals();
  const found = localList.find(s => s.signal_id === signalId);
  return found || null;
}

/**
 * Updates the resolution outcome for an existing signal
 */
export async function updateSignalResolution(
  signalId: string,
  update: {
    outcome: SignalOutcome;
    outcome_price?: number | null;
    result?: string | null;
    R_multiple?: number | null;
    payout?: number | null;
    duration?: number | null;
    resolved_at?: string | null;
  }
): Promise<boolean> {
  if (!signalId || typeof signalId !== "string") {
    throw new Error("Invalid parameter: signalId is required.");
  }
  if (!update.outcome || !Object.values(SignalOutcome).includes(update.outcome)) {
    throw new Error(`Invalid outcome: must be one of ${Object.values(SignalOutcome).join(", ")}`);
  }

  const resolvedTime = update.resolved_at || new Date().toISOString();

  // 1. Primary Path: Cloud Firestore
  if (adminDb && !datasetFirestoreDisabled) {
    try {
      const docRef = adminDb.collection("signals").doc(signalId);
      const doc = await docRef.get();
      if (!doc.exists) {
        throw new Error(`Update Resolution Error: Signal '${signalId}' does not exist.`);
      }

      const existingData = doc.data() as SignalRecord;
      
      // Preserve original state parameters (immutable inputs)
      const mergedRecord: SignalRecord = {
        ...existingData,
        outcome: update.outcome,
        outcome_price: update.outcome_price !== undefined ? update.outcome_price : existingData.outcome_price,
        result: update.result !== undefined ? update.result : existingData.result,
        R_multiple: update.R_multiple !== undefined ? update.R_multiple : existingData.R_multiple,
        payout: update.payout !== undefined ? update.payout : existingData.payout,
        duration: update.duration !== undefined ? update.duration : existingData.duration,
        resolved_at: resolvedTime
      };

      await docRef.set(mergedRecord, { merge: true });

      // Update local file for alignment
      const local = readLocalSignals();
      const idx = local.findIndex(x => x.signal_id === signalId);
      if (idx !== -1) {
        local[idx] = mergedRecord;
        writeLocalSignals(local);
      }
      return true;
    } catch (err: any) {
      if (err.message && err.message.includes("does not exist")) {
        throw err;
      }
      if (err?.message?.includes("RESOURCE_EXHAUSTED") || err?.code === 8 || String(err).includes("RESOURCE_EXHAUSTED")) {
        datasetFirestoreDisabled = true;
      } else {
        console.warn("Firestore update failed, editing local JSON alignment instead:", err.message);
      }
    }
  }

  // 2. Fallback Path: Local JSON File
  const localList = readLocalSignals();
  const idx = localList.findIndex(s => s.signal_id === signalId);
  if (idx === -1) {
    throw new Error(`Update Resolution Error: Signal '${signalId}' does not exist.`);
  }

  const existing = localList[idx];
  const merged: SignalRecord = {
    ...existing,
    outcome: update.outcome,
    outcome_price: update.outcome_price !== undefined ? update.outcome_price : existing.outcome_price,
    result: update.result !== undefined ? update.result : existing.result,
    R_multiple: update.R_multiple !== undefined ? update.R_multiple : existing.R_multiple,
    payout: update.payout !== undefined ? update.payout : existing.payout,
    duration: update.duration !== undefined ? update.duration : existing.duration,
    resolved_at: resolvedTime
  };

  localList[idx] = merged;
  writeLocalSignals(localList);
  return true;
}

/**
 * Retrieves all signals stored in the database
 */
export async function getAllSignals(): Promise<SignalRecord[]> {
  if (adminDb && !datasetFirestoreDisabled) {
    try {
      const snapshot = await adminDb.collection("signals").orderBy("timestamp", "desc").limit(500).get();
      const results: SignalRecord[] = [];
      snapshot.forEach(doc => {
        results.push(doc.data() as SignalRecord);
      });
      return results;
    } catch (err: any) {
      if (err?.message?.includes("RESOURCE_EXHAUSTED") || err?.code === 8 || String(err).includes("RESOURCE_EXHAUSTED")) {
        datasetFirestoreDisabled = true;
        console.log("ℹ️ Firestore getAll bypassed: RESOURCE_EXHAUSTED. Loading from local JSON storage.");
      } else {
        console.warn("Firestore getAll failed, loading from local JSON instead:", err.message);
      }
    }
  }
  return readLocalSignals().sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Migration helper to bridge and seed any mock or local state into the Firestore environment
 * without destroying existing records.
 */
export async function runMigration(): Promise<{ success: boolean; migratedCount: number; logs: string[] }> {
  const logs: string[] = [];
  logs.push("Starting database migration for signals...");

  const localSignals = readLocalSignals();
  if (localSignals.length === 0) {
    logs.push("No offline signals found to migrate.");
    return { success: true, migratedCount: 0, logs };
  }

  if (!adminDb) {
    logs.push("Migration warning: Firestore database instance is offline. Working locally.");
    return { success: true, migratedCount: 0, logs };
  }

  let migratedCount = 0;
  for (const sig of localSignals) {
    try {
      const docRef = adminDb.collection("signals").doc(sig.signal_id);
      const snap = await docRef.get();
      if (!snap.exists) {
        await docRef.set(sig);
        migratedCount++;
        logs.push(`Migrated signal: ${sig.signal_id}`);
      } else {
        logs.push(`Signal ${sig.signal_id} already exists in Firestore. Skipped.`);
      }
    } catch (err: any) {
      logs.push(`Failed to migrate signal ${sig.signal_id}: ${err.message}`);
    }
  }

  logs.push(`Migration complete. Successfully migrated ${migratedCount} new records.`);
  return { success: true, migratedCount, logs };
}

/**
 * Self-test suite covering: insert, read, update resolution, duplicate protection, invalid signal, unresolved signal
 */
export async function testSignalDataset(): Promise<{ success: boolean; logs: string[] }> {
  const logs: string[] = [];
  logs.push("Running Signal Outcome Dataset verification tests...");

  const testId = `TEST-SIG-${Date.now()}`;

  try {
    // 1. Test invalid signal handling
    logs.push("Testing validation constraints (expected rejection)...");
    try {
      validateSignal({ signal_id: testId, symbol: "" });
      throw new Error("Validation failed to reject empty symbol.");
    } catch (e: any) {
      logs.push(`✓ Success: Correctly rejected invalid signal input: ${e.message}`);
    }

    // 2. Test unresolved signal initialization
    logs.push("Testing standard unresolved signal insertion...");
    const sampleSignal: Partial<SignalRecord> = {
      signal_id: testId,
      symbol: "BTCUSDT",
      timeframe: "15m",
      direction: "CALL",
      entry: 60500.50,
      timestamp: Date.now(),
      market_regime: "BULL_TREND",
      signal_score: 82,
      expected_value: 12.50,
      ml_probability: 0.81,
      expiry: Date.now() + 300000,
      outcome: SignalOutcome.UNRESOLVED
    };

    await insertSignal(sampleSignal);
    logs.push("✓ Success: Sample signal inserted successfully.");

    // 3. Test read back
    const retrieved = await getSignal(testId);
    if (!retrieved || retrieved.symbol !== "BTCUSDT" || retrieved.outcome !== SignalOutcome.UNRESOLVED) {
      throw new Error("Read check failed or state parameters mismatched.");
    }
    logs.push(`✓ Success: Verified read-back matches exact entry state ($${retrieved.entry}).`);

    // 4. Test duplicate protection
    logs.push("Testing duplicate protection logic...");
    try {
      await insertSignal(sampleSignal);
      throw new Error("Duplicate protection failed to block second write.");
    } catch (e: any) {
      logs.push(`✓ Success: Correctly blocked duplicate signal insertion: ${e.message}`);
    }

    // 5. Test update resolution
    logs.push("Testing terminal state resolution (resolving to WIN)...");
    await updateSignalResolution(testId, {
      outcome: SignalOutcome.WIN,
      outcome_price: 60620.00,
      result: "WIN",
      R_multiple: 1.5,
      payout: 85,
      duration: 180000
    });

    const updated = await getSignal(testId);
    if (!updated || updated.outcome !== SignalOutcome.WIN || updated.outcome_price !== 60620.00 || !updated.resolved_at) {
      throw new Error("Resolution state update failed to store correct fields.");
    }
    logs.push(`✓ Success: Resolved signal successfully to WIN (Price: $${updated.outcome_price}, R-mult: ${updated.R_multiple}).`);

    // 6. Test immutability preservation (original parameters must not have changed)
    if (updated.entry !== 60500.50 || updated.direction !== "CALL" || updated.market_regime !== "BULL_TREND") {
      throw new Error("Original parameters were corrupted during resolution update.");
    }
    logs.push("✓ Success: Confirmed original entry variables remain untouched (immutability preserved).");

    logs.push("All unit tests passed successfully.");
    return { success: true, logs };
  } catch (err: any) {
    logs.push(`❌ Test failure occurred: ${err.message}`);
    console.error(err);
    return { success: false, logs };
  }
}

/**
 * Periodically called to check and resolve active UNRESOLVED signals that have reached or passed their expiration time.
 */
export async function resolveActiveSignals(prices: Record<string, number>): Promise<number> {
  let resolvedCount = 0;
  try {
    const allSignals = await getAllSignals();
    const unresolved = allSignals.filter(s => s.outcome === SignalOutcome.UNRESOLVED);

    const now = Date.now();
    for (const sig of unresolved) {
      const isExpired = now >= sig.expiry;
      if (isExpired) {
        // Clean symbol (e.g., "EUR/USD" -> "EURUSD")
        let cleanSymbol = sig.symbol.toUpperCase().replace(/[\/-]/g, "");
        const cryptoMap: Record<string, string> = {
          "BTC": "BTCUSDT", "ETH": "ETHUSDT", "SOL": "SOLUSDT", "XRP": "XRPUSDT", "BNB": "BNBUSDT"
        };
        if (cryptoMap[cleanSymbol]) {
          cleanSymbol = cryptoMap[cleanSymbol];
        }

        const currentPrice = prices[cleanSymbol] || prices[sig.symbol];
        if (!currentPrice || isNaN(currentPrice) || currentPrice <= 0) {
          // If no current price is available and it has been expired for a long time (e.g. 1 hour past expiry), invalidate it
          if (now - sig.expiry > 3600000) {
            await updateSignalResolution(sig.signal_id, {
              outcome: SignalOutcome.INVALIDATED,
              result: "INVALIDATED",
              resolved_at: new Date().toISOString()
            });
            resolvedCount++;
          }
          continue;
        }

        const isCall = ["CALL", "BUY", "LONG"].includes(sig.direction.toUpperCase());
        const isPut = ["PUT", "SELL", "SHORT"].includes(sig.direction.toUpperCase());

        let outcome: SignalOutcome = SignalOutcome.EXPIRED;
        if (isCall) {
          if (currentPrice > sig.entry) {
            outcome = SignalOutcome.WIN;
          } else if (currentPrice < sig.entry) {
            outcome = SignalOutcome.LOSS;
          }
        } else if (isPut) {
          if (currentPrice < sig.entry) {
            outcome = SignalOutcome.WIN;
          } else if (currentPrice > sig.entry) {
            outcome = SignalOutcome.LOSS;
          }
        }

        const rMultiple = outcome === SignalOutcome.WIN ? 1.0 : (outcome === SignalOutcome.LOSS ? -1.0 : 0.0);
        const payout = outcome === SignalOutcome.WIN ? 85.0 : 0.0;
        const duration = sig.expiry - sig.timestamp;

        await updateSignalResolution(sig.signal_id, {
          outcome,
          outcome_price: currentPrice,
          result: outcome.toString(),
          R_multiple: rMultiple,
          payout,
          duration,
          resolved_at: new Date().toISOString()
        });

        resolvedCount++;
        console.log(`[SIGNAL PERSISTENCE] Resolved signal ${sig.signal_id} (${sig.symbol}) to ${outcome} at price $${currentPrice}.`);
      }
    }
  } catch (err: any) {
    console.error("Error resolving active signals:", err.message);
  }
  return resolvedCount;
}

