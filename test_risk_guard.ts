import { RiskGuard, RiskGuardConfig, RiskGuardInputs, RiskGuardReport } from "./src/utils/riskGuard";

// =========================================================================
// STANDARD CONFIG AND OPTIMAL PASSING INPUTS FOR TESTS
// =========================================================================
const defaultTestConfig: RiskGuardConfig = {
  minimumSignalScore: 70,
  minimumExpectedValue: 10.0,
  minimumMLProbability: 0.60,
  maximumSpread: 0.002, // 0.2%
  maximumVolatility: 2.5,
  maximumDailySignals: 10,
  maximumConsecutiveLosses: 3,
  dailyDrawdownLimit: 500, // $500 max drawdown
  newsBlackout: true,
  correlationExposure: 0.70,
  staleDataProtection: 5000 // 5 seconds
};

const optimalPassingInputs: RiskGuardInputs = {
  signalScore: 85,
  expectedValue: 25.5,
  mlProbability: 0.75,
  spread: 0.001,
  volatility: 1.2,
  dailySignalsCount: 2,
  consecutiveLossesCount: 0,
  currentDailyDrawdown: 50,
  isNewsBlackoutActive: false,
  currentCorrelationExposure: 0.35,
  dataAgeMs: 250
};

// =========================================================================
// VERIFICATION RUNNER
// =========================================================================
async function runRiskGuardTests() {
  console.log("============================================================");
  console.log("          STARTING SIGNAL RISK GUARD VERIFICATION TESTS       ");
  console.log("============================================================\n");

  let totalCount = 0;
  let passedCount = 0;

  const assertRisk = (
    name: string,
    inputs: RiskGuardInputs,
    config: RiskGuardConfig,
    expectedAllowed: boolean,
    expectedRiskLevel: "LOW" | "MODERATE" | "HIGH",
    expectedReasonSnippet?: string
  ) => {
    totalCount++;
    const report = RiskGuard.evaluateRisk(inputs, config);
    const isAllowedPass = report.allowed === expectedAllowed;
    const isRiskLevelPass = report.riskLevel === expectedRiskLevel;
    
    let isSnippetPass = true;
    if (expectedReasonSnippet) {
      isSnippetPass = report.reasons.some(r => r.toLowerCase().includes(expectedReasonSnippet.toLowerCase()));
    }

    console.log(`[TEST] ${name}`);
    console.log(`   Allowed:    ${report.allowed} (Expected: ${expectedAllowed})`);
    console.log(`   Risk Level: ${report.riskLevel} (Expected: ${expectedRiskLevel})`);
    console.log(`   Reasons:    ${report.reasons.length > 0 ? report.reasons.join(" | ") : "None"}`);

    if (isAllowedPass && isRiskLevelPass && isSnippetPass) {
      console.log("   RESULT:     ✅ PASS\n");
      passedCount++;
      return true;
    } else {
      console.log("   RESULT:     ❌ FAIL");
      if (!isAllowedPass) console.log(`      -> Allowed Mismatch: Got ${report.allowed}, Expected ${expectedAllowed}`);
      if (!isRiskLevelPass) console.log(`      -> RiskLevel Mismatch: Got ${report.riskLevel}, Expected ${expectedRiskLevel}`);
      if (!isSnippetPass) console.log(`      -> Expected reason snippet "${expectedReasonSnippet}" was not found in reasons`);
      console.log("\n");
      return false;
    }
  };

  // 1. Perfect Pass
  assertRisk(
    "Case 1: Standard Optimal Input - Clean Pass",
    optimalPassingInputs,
    defaultTestConfig,
    true,
    "LOW"
  );

  // 2. Minimum Signal Score Failure
  const lowScoreInputs = { ...optimalPassingInputs, signalScore: 65 };
  assertRisk(
    "Case 2: Signal Score below minimum",
    lowScoreInputs,
    defaultTestConfig,
    false,
    "MODERATE",
    "Signal score 65 falls below minimum"
  );

  // 3. Minimum Expected Value Failure
  const lowEVInputs = { ...optimalPassingInputs, expectedValue: 5.5 };
  assertRisk(
    "Case 3: Expected Value below minimum",
    lowEVInputs,
    defaultTestConfig,
    false,
    "MODERATE",
    "Expected value $5.5 is below minimum"
  );

  // 4. Expected Value Unavailable Failure
  const nullEVInputs = { ...optimalPassingInputs, expectedValue: null };
  assertRisk(
    "Case 4: Expected Value Unavailable",
    nullEVInputs,
    defaultTestConfig,
    false,
    "MODERATE",
    "Expected value calculation is unavailable"
  );

  // 5. ML Probability below minimum (when available)
  const lowMLInputs = { ...optimalPassingInputs, mlProbability: 0.50 };
  assertRisk(
    "Case 5: ML Probability below minimum",
    lowMLInputs,
    defaultTestConfig,
    false,
    "MODERATE",
    "ML probability 50.0% is below minimum"
  );

  // 6. ML Probability null (unavailable) - passes because filter is skipped when unavailable
  const nullMLInputs = { ...optimalPassingInputs, mlProbability: null };
  assertRisk(
    "Case 6: ML Probability unavailable passes ML filter",
    nullMLInputs,
    defaultTestConfig,
    true,
    "LOW"
  );

  // 7. Maximum Spread Failure
  const highSpreadInputs = { ...optimalPassingInputs, spread: 0.005 };
  assertRisk(
    "Case 7: Maximum Spread exceeded",
    highSpreadInputs,
    defaultTestConfig,
    false,
    "MODERATE",
    "Market spread 0.005 exceeds"
  );

  // 8. Maximum Volatility Failure
  const highVolInputs = { ...optimalPassingInputs, volatility: 3.1 };
  assertRisk(
    "Case 8: Maximum Volatility exceeded",
    highVolInputs,
    defaultTestConfig,
    false,
    "MODERATE",
    "Market volatility 3.1 exceeds"
  );

  // 9. Maximum Daily Signals Cap Failure
  const highDailySignalsInputs = { ...optimalPassingInputs, dailySignalsCount: 10 };
  assertRisk(
    "Case 9: Daily signals cap reached",
    highDailySignalsInputs,
    defaultTestConfig,
    false,
    "MODERATE",
    "Daily signals cap reached"
  );

  // 10. Maximum Consecutive Losses Failure (Critical, Elevates to HIGH risk)
  const highLossesInputs = { ...optimalPassingInputs, consecutiveLossesCount: 3 };
  assertRisk(
    "Case 10: Consecutive losses exceeded (HIGH Risk)",
    highLossesInputs,
    defaultTestConfig,
    false,
    "HIGH",
    "Consecutive losses limit breached"
  );

  // 11. Daily Drawdown Limit Failure (Critical, Elevates to HIGH risk)
  const highDrawdownInputs = { ...optimalPassingInputs, currentDailyDrawdown: 500 };
  assertRisk(
    "Case 11: Daily drawdown limit breached (HIGH Risk)",
    highDrawdownInputs,
    defaultTestConfig,
    false,
    "HIGH",
    "Daily drawdown limit breached"
  );

  // 12. News Blackout suspension (Critical, Elevates to HIGH risk)
  const newsBlackoutInputs = { ...optimalPassingInputs, isNewsBlackoutActive: true };
  assertRisk(
    "Case 12: News blackout period (HIGH Risk)",
    newsBlackoutInputs,
    defaultTestConfig,
    false,
    "HIGH",
    "News release blackout is active"
  );

  // 13. Correlation Exposure Limit
  const correlationInputs = { ...optimalPassingInputs, currentCorrelationExposure: 0.85 };
  assertRisk(
    "Case 13: Correlation Exposure Limit breached",
    correlationInputs,
    defaultTestConfig,
    false,
    "MODERATE",
    "Correlation exposure 0.85 exceeds"
  );

  // 14. Stale Data Protection (Critical, Elevates to HIGH risk)
  const staleDataInputs = { ...optimalPassingInputs, dataAgeMs: 6000 };
  assertRisk(
    "Case 14: Stale price data (HIGH Risk)",
    staleDataInputs,
    defaultTestConfig,
    false,
    "HIGH",
    "Price data is stale"
  );

  // 15. Combination Failure (Multiple minor failures combine to HIGH risk)
  // Let's fail 3 minor categories: Score, EV, and Spread
  const multiFailInputs = {
    ...optimalPassingInputs,
    signalScore: 60,
    expectedValue: 4.0,
    spread: 0.01
  };
  assertRisk(
    "Case 15: Compound Minor Breaches (Score + EV + Spread) -> HIGH risk",
    multiFailInputs,
    defaultTestConfig,
    false,
    "HIGH",
    "exceeds configured maximum"
  );

  // =========================================================================
  // OVERALL STATUS SUMMARY
  // =========================================================================
  console.log("============================================================");
  console.log(`      VERIFICATION SUMMARY: ${passedCount}/${totalCount} TESTS PASSED.`);
  if (passedCount === totalCount) {
    console.log("🎉 ALL SIGNAL RISK GUARD TESTS COMPLETED SUCCESSFULLY!");
  } else {
    console.log("❌ SOME RISK GUARD TESTS FAILED. CHECK LIMIT BREACH ASSIGNMENTS.");
    process.exit(1);
  }
  console.log("============================================================");
}

runRiskGuardTests();
