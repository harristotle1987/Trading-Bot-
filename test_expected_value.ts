import { ExpectedValueEngine, ExpectedValueReport } from "./src/utils/expectedValueEngine";

async function runExpectedValueTests() {
  console.log("============================================================");
  console.log("       STARTING EXPECTED VALUE ENGINE VALIDATION TESTS        ");
  console.log("============================================================\n");

  let totalCount = 0;
  let passedCount = 0;

  const assertEV = (
    name: string,
    report: ExpectedValueReport,
    expectedEV: number | null,
    expectedPLoss: number
  ) => {
    totalCount++;
    const isPLossPass = report.pLoss === expectedPLoss;
    const isEVPass = report.expectedValue === expectedEV;

    console.log(`[TEST] ${name}`);
    console.log(`   Method:      ${report.calculationMethod}`);
    console.log(`   P(Win):      ${report.pWin} | P(Loss): ${report.pLoss} (Expected: ${expectedPLoss})`);
    console.log(`   Payout Rate: ${report.payout ?? "N/A"}`);
    console.log(`   Cost Est:    $${report.costEstimate}`);
    console.log(`   EV:          ${report.expectedValue !== null ? "$" + report.expectedValue : "UNAVAILABLE"} (Expected: ${expectedEV !== null ? "$" + expectedEV : "UNAVAILABLE"})`);

    if (isPLossPass && isEVPass) {
      console.log("   RESULT:      ✅ PASS\n");
      passedCount++;
      return true;
    } else {
      console.log("   RESULT:      ❌ FAIL");
      if (!isPLossPass) console.log(`      -> PLoss Mismatch: ${report.pLoss} !== ${expectedPLoss}`);
      if (!isEVPass) console.log(`      -> EV Mismatch: ${report.expectedValue} !== ${expectedEV}`);
      console.log("\n");
      return false;
    }
  };

  // -------------------------------------------------------------------------
  // CONVENTIONAL TRADING EXAMPLES
  // -------------------------------------------------------------------------
  
  // Math Example 1: 60% win-rate, Avg Win $150, Avg Loss $100, Cost $5
  // EV = (0.60 * 150) - (0.40 * 100) - 5 = 90 - 40 - 5 = 45
  const repConv1 = ExpectedValueEngine.calculateConventional({
    pWin: 0.60,
    averageWin: 150,
    averageLoss: 100,
    costEstimate: 5.0
  });
  assertEV("Conventional: High Win Rate Setup with Costs", repConv1, 45, 0.40);

  // Math Example 2: 40% win-rate, Avg Win $300, Avg Loss $100, Cost $10
  // EV = (0.40 * 300) - (0.60 * 100) - 10 = 120 - 60 - 10 = 50
  const repConv2 = ExpectedValueEngine.calculateConventional({
    pWin: 0.40,
    averageWin: 300,
    averageLoss: 100,
    costEstimate: 10.0
  });
  assertEV("Conventional: Low Win Rate, High R:R Setup", repConv2, 50, 0.60);

  // -------------------------------------------------------------------------
  // BINARY OPTION EXAMPLES
  // -------------------------------------------------------------------------

  // Math Example 3: 58% win-rate, Stake $100, Payout Rate 82%
  // EV = (0.58 * (0.82 * 100)) - (0.42 * 100) = (0.58 * 82) - 42 = 47.56 - 42 = 5.56
  const repBin1 = ExpectedValueEngine.calculateBinary({
    pWin: 0.58,
    stake: 100,
    payoutRate: 0.82
  });
  assertEV("Binary: Strong Positive Edge Setup", repBin1, 5.56, 0.42);

  // Math Example 4: 52% win-rate, Stake $50, Payout Rate 85%
  // EV = (0.52 * 42.5) - (0.48 * 50) = 22.1 - 24.0 = -1.9
  const repBin2 = ExpectedValueEngine.calculateBinary({
    pWin: 0.52,
    stake: 50,
    payoutRate: 0.85
  });
  assertEV("Binary: Thin Win Rate Negative EV Setup", repBin2, -1.9, 0.48);

  // Math Example 5: Unknown/Missing Payout Rate
  const repBinMissing = ExpectedValueEngine.calculateBinary({
    pWin: 0.60,
    stake: 100,
    payoutRate: null
  });
  assertEV("Binary: Graceful Degradation on Missing Payout", repBinMissing, null, 0.40);

  // =========================================================================
  // OVERALL STATUS SUMMARY
  // =========================================================================
  console.log("============================================================");
  console.log(`      VERIFICATION SUMMARY: ${passedCount}/${totalCount} TESTS PASSED.`);
  if (passedCount === totalCount) {
    console.log("🎉 ALL EXPECTED VALUE ENGINE TESTS COMPLETED SUCCESSFULLY!");
  } else {
    console.log("❌ SOME TESTS FAILED. RECHECK MATH EQUATIONS.");
    process.exit(1);
  }
  console.log("============================================================");
}

runExpectedValueTests();
