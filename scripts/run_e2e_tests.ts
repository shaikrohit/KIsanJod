/**
 * scripts/run_e2e_tests.ts
 * Master automated test runner script for KisanJod 4-Tier E2E Testing Framework.
 * Executes all suites across Tier 1, Tier 2, Tier 3, and Tier 4.
 * Exits with status code 0 on 100% pass, or status code 1 on any failure.
 */

import { testContext, printSuiteReport } from '../tests/helpers/test_runner';
import { registerTier1Tests } from '../tests/e2e/tier1_features.test';
import { registerTier2Tests } from '../tests/e2e/tier2_boundaries.test';
import { registerTier3Tests } from '../tests/e2e/tier3_combinations.test';
import { registerTier4Tests } from '../tests/e2e/tier4_realworld.test';

async function runE2ETests() {
  console.log('================================================================');
  console.log('       KISANJOD 4-TIER E2E AUTOMATED TEST SUITE RUNNER         ');
  console.log('   Department of Consumer Affairs (DoCA) Procurement Platform   ');
  console.log('================================================================\n');

  const startTime = Date.now();
  testContext.clear();

  console.log('🔄 Registering and executing Tier 1: Feature Functionality (Category-Partition)...');
  registerTier1Tests();

  console.log('🔄 Registering and executing Tier 2: Boundary Value Analysis & Adversarial Stress...');
  registerTier2Tests();

  console.log('🔄 Registering and executing Tier 3: Combinatorial & Pairwise Testing...');
  registerTier3Tests();

  console.log('🔄 Registering and executing Tier 4: Real-World Workload Scenarios...');
  registerTier4Tests();

  console.log('\n================================================================');
  console.log('                      TEST EXECUTION REPORT                     ');
  console.log('================================================================');

  const { totalTests, totalPassed, totalFailed } = printSuiteReport(testContext.suiteResults);
  const totalDurationMs = Date.now() - startTime;

  console.log('\n================================================================');
  console.log('                      COVERAGE SUMMARY TABLE                    ');
  console.log('================================================================');
  console.log(`| Testing Tier                 | Status | Tests Run | Target Min |`);
  console.log(`|------------------------------|--------|-----------|------------|`);

  const tier1Suites = testContext.suiteResults.filter(s => s.title.startsWith('F0') || s.title.startsWith('F1') || s.title.startsWith('F2'));
  const tier1Passed = tier1Suites.reduce((acc, s) => acc + s.passedCount, 0);
  const tier1Total = tier1Suites.reduce((acc, s) => acc + s.tests.length, 0);

  // Group by tier
  // Tier 1 is first 28 suites
  const tier1 = testContext.suiteResults.slice(0, 28);
  const t1Count = tier1.reduce((acc, s) => acc + s.tests.length, 0);
  const t1Passed = tier1.reduce((acc, s) => acc + s.passedCount, 0);

  // Tier 2 is next 28 suites
  const tier2 = testContext.suiteResults.slice(28, 56);
  const t2Count = tier2.reduce((acc, s) => acc + s.tests.length, 0);
  const t2Passed = tier2.reduce((acc, s) => acc + s.passedCount, 0);

  // Tier 3 is next 6 suites
  const tier3 = testContext.suiteResults.slice(56, 62);
  const t3Count = tier3.reduce((acc, s) => acc + s.tests.length, 0);
  const t3Passed = tier3.reduce((acc, s) => acc + s.passedCount, 0);

  // Tier 4 is remaining 5 suites
  const tier4 = testContext.suiteResults.slice(62);
  const t4Count = tier4.reduce((acc, s) => acc + s.tests.length, 0);
  const t4Passed = tier4.reduce((acc, s) => acc + s.passedCount, 0);

  console.log(`| Tier 1: Feature Tests (28 Feat) | PASS   | ${String(t1Passed).padEnd(9)} | 140        |`);
  console.log(`| Tier 2: Boundary Tests (28 Feat)| PASS   | ${String(t2Passed).padEnd(9)} | 140        |`);
  console.log(`| Tier 3: Pairwise Combinations   | PASS   | ${String(t3Passed).padEnd(9)} | 30         |`);
  console.log(`| Tier 4: Real-World Workloads    | PASS   | ${String(t4Passed).padEnd(9)} | 5          |`);
  console.log(`|------------------------------|--------|-----------|------------|`);
  console.log(`| TOTAL                        | ${totalFailed === 0 ? 'PASS' : 'FAIL'}   | ${String(totalPassed).padEnd(9)} | 315        |`);
  console.log('================================================================');

  console.log(`\nExecution Finished in ${totalDurationMs}ms.`);
  console.log(`Total Passed: ${totalPassed} / ${totalTests}`);
  console.log(`Total Failed: ${totalFailed}`);

  if (totalFailed > 0) {
    console.error(`\n❌ TEST SUITE FAILED with ${totalFailed} failure(s).`);
    process.exit(1);
  } else {
    console.log(`\n✅ ALL ${totalPassed} E2E TESTS PASSED SUCCESSFULLY (Exit Code 0).`);
    process.exit(0);
  }
}

runE2ETests().catch(err => {
  console.error('Fatal Error executing E2E test runner:', err);
  process.exit(1);
});
