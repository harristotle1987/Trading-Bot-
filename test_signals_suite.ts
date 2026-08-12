import { testSignalDataset, runMigration, getAllSignals } from "./src/utils/signalDataset";

async function main() {
  console.log("=========================================");
  console.log("   SIGNAL OUTCOME DATASET TEST RUNNER    ");
  console.log("=========================================\n");

  // 1. Run Migration first to prepare collections
  console.log("[MIGRATION START]");
  const migrationRes = await runMigration();
  migrationRes.logs.forEach(log => console.log(`  [MIGRATE] ${log}`));
  console.log(`[MIGRATION END] Success: ${migrationRes.success}\n`);

  // 2. Run Comprehensive Unit Testing suite
  console.log("[UNIT TESTS START]");
  const testRes = await testSignalDataset();
  testRes.logs.forEach(log => console.log(`  [TEST] ${log}`));
  console.log(`[UNIT TESTS END] Passed: ${testRes.success}\n`);

  // 3. Print stored signals summary to prove persistence
  console.log("[STORED SIGNALS SUMMARY]");
  try {
    const signals = await getAllSignals();
    console.log(`  Total persistent signals tracked: ${signals.length}`);
    if (signals.length > 0) {
      console.log("  Sample Records:");
      signals.slice(0, 5).forEach(s => {
        console.log(`    - ID: ${s.signal_id} | ${s.symbol} | Direction: ${s.direction} | Score: ${s.signal_score} | Outcome: ${s.outcome}`);
      });
    }
  } catch (err: any) {
    console.error("  Failed to load stored signals summary:", err.message);
  }

  console.log("\n=========================================");
  if (testRes.success && migrationRes.success) {
    console.log("   ALL VALIDATIONS COMPLETED: PASSED     ");
    console.log("=========================================");
    process.exit(0);
  } else {
    console.log("   VALIDATIONS COMPLETED: FAILED         ");
    console.log("=========================================");
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Unhandle test runner exception:", err);
  process.exit(1);
});
