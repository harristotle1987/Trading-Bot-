import { SignalScoringEngine, ScoreInputs, SignalScoreReport } from "./src/utils/signalScoringEngine";

async function runScoringTests() {
  console.log("============================================================");
  console.log("       STARTING SIGNAL QUALITY SCORING ENGINE TESTS          ");
  console.log("============================================================\n");

  let totalCount = 0;
  let passedCount = 0;

  const assertScore = (
    name: string,
    inputs: ScoreInputs,
    agreementRatio: string,
    expectedScore: number
  ) => {
    totalCount++;
    const report = SignalScoringEngine.calculateScore(inputs, agreementRatio);
    const isPass = report.signalScore === expectedScore;

    console.log(`[TEST] ${name}`);
    console.log(`   Inputs:     Trend=${inputs.trendScore} | Momentum=${inputs.momentumScore} | Regime=${inputs.marketRegimeScore} | Agreement=${inputs.strategyAgreementScore} | ML=${inputs.mlProbability !== null ? (inputs.mlProbability * 100).toFixed(0) + "%" : "UNAVAILABLE"} | Vol=${inputs.volumeScore} | Volatility=${inputs.volatilityScore} | MTF=${inputs.mtfScore}`);
    console.log(`   Agreement:  ${report.strategyAgreement}`);
    console.log(`   Final Score: ${report.signalScore} (Expected: ${expectedScore})`);
    console.log(`   Breakdown:  Raw Sum=${report.scoreBreakdown.rawSum}/${report.scoreBreakdown.maxPossible}`);
    console.log(`   Reasons:    ${report.reasons.join(" | ")}`);

    if (isPass) {
      console.log("   RESULT:      ✅ PASS\n");
      passedCount++;
      return true;
    } else {
      console.log("   RESULT:      ❌ FAIL");
      console.log(`      -> Score Mismatch: ${report.signalScore} !== ${expectedScore}`);
      console.log("\n");
      return false;
    }
  };

  // 1. Score = 0 (Total absence of indicators, ML available but 0 probability)
  const inputs0: ScoreInputs = {
    trendScore: 0,
    momentumScore: 0,
    marketRegimeScore: 0,
    strategyAgreementScore: 0,
    mlProbability: 0.0,
    volumeScore: 0,
    volatilityScore: 0,
    mtfScore: 0
  };
  assertScore("Score 0 Setup (All zero)", inputs0, "0/6", 0);

  // 2. Score = 50 (With ML available, earning exactly 50/100 points)
  // Earn: Trend=10, Momentum=10, Regime=10, Agreement=10, ML=0.5 (10 pts), Vol=0, Volatility=0, MTF=0 -> 50 pts
  const inputs50: ScoreInputs = {
    trendScore: 10,
    momentumScore: 10,
    marketRegimeScore: 10,
    strategyAgreementScore: 10,
    mlProbability: 0.50, // 0.5 * 20 = 10 pts
    volumeScore: 0,
    volatilityScore: 0,
    mtfScore: 0
  };
  assertScore("Score 50 Setup (ML Available)", inputs50, "3/6", 50);

  // 3. Score = 50 (With ML unavailable, scaling non-ML baseline)
  // Earn: Trend=10, Momentum=10, Regime=10, Agreement=10, Vol=0, Volatility=0, MTF=0 -> 40 pts out of 80 max
  // Normalized: (40 / 80) * 100 = 50
  const inputs50Scaled: ScoreInputs = {
    trendScore: 10,
    momentumScore: 10,
    marketRegimeScore: 10,
    strategyAgreementScore: 10,
    mlProbability: null, // unavailable
    volumeScore: 0,
    volatilityScore: 0,
    mtfScore: 0
  };
  assertScore("Score 50 Setup (ML Scaled / Unavailable)", inputs50Scaled, "3/6", 50);

  // 4. Score = 75 (ML unavailable, scaling non-ML baseline)
  // Earn: Trend=15, Momentum=15, Regime=15, Agreement=15, Vol=0, Volatility=0, MTF=0 -> 60 pts out of 80
  // Normalized: (60 / 80) * 100 = 75
  const inputs75Scaled: ScoreInputs = {
    trendScore: 15,
    momentumScore: 15,
    marketRegimeScore: 15,
    strategyAgreementScore: 15,
    mlProbability: null,
    volumeScore: 0,
    volatilityScore: 0,
    mtfScore: 0
  };
  assertScore("Score 75 Setup (ML Scaled / Unavailable)", inputs75Scaled, "4/6", 75);

  // 5. Score = 85 (ML available)
  // Earn: Trend=15, Momentum=15, Regime=15, Agreement=15, ML=0.75 (15 pts), Vol=10, Volatility=0, MTF=0 -> 85 pts
  const inputs85: ScoreInputs = {
    trendScore: 15,
    momentumScore: 15,
    marketRegimeScore: 15,
    strategyAgreementScore: 15,
    mlProbability: 0.75, // 15 pts
    volumeScore: 10,
    volatilityScore: 0,
    mtfScore: 0
  };
  assertScore("Score 85 Setup (ML Available)", inputs85, "5/6", 85);

  // 6. Score = 100 (Maximum possible score, ML available)
  const inputs100: ScoreInputs = {
    trendScore: 15,
    momentumScore: 15,
    marketRegimeScore: 15,
    strategyAgreementScore: 15,
    mlProbability: 1.0, // 20 pts
    volumeScore: 10,
    volatilityScore: 5,
    mtfScore: 5
  };
  assertScore("Score 100 Setup (ML Available Perfect Score)", inputs100, "6/6", 100);

  // 7. Score = 100 (Maximum possible score, ML unavailable, scaled baseline)
  const inputs100Scaled: ScoreInputs = {
    trendScore: 15,
    momentumScore: 15,
    marketRegimeScore: 15,
    strategyAgreementScore: 15,
    mlProbability: null,
    volumeScore: 10,
    volatilityScore: 5,
    mtfScore: 5
  };
  assertScore("Score 100 Setup (ML Scaled Perfect Score)", inputs100Scaled, "6/6", 100);

  // 8. Boundary Conditions: Clamping values over theoretical maximums
  const inputsClamped: ScoreInputs = {
    trendScore: 999,
    momentumScore: 999,
    marketRegimeScore: 999,
    strategyAgreementScore: 999,
    mlProbability: 9.9,
    volumeScore: 999,
    volatilityScore: 999,
    mtfScore: 999
  };
  assertScore("Clamping Extreme Inputs Boundary Test", inputsClamped, "6/6", 100);

  // =========================================================================
  // OVERALL STATUS SUMMARY
  // =========================================================================
  console.log("============================================================");
  console.log(`      VERIFICATION SUMMARY: ${passedCount}/${totalCount} TESTS PASSED.`);
  if (passedCount === totalCount) {
    console.log("🎉 ALL SIGNAL QUALITY SCORING ENGINE TESTS PASSED SUCCESSFULLY!");
  } else {
    console.log("❌ SOME TESTS FAILED. CHECK SCALE CLAMPINGS AND TIE BREAKS.");
    process.exit(1);
  }
  console.log("============================================================");
}

runScoringTests();
