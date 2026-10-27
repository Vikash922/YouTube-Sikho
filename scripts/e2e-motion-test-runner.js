#!/usr/bin/env node
/**
 * MASTER E2E MOTION & INTERACTION TEST RUNNER
 * -------------------------------------------------------------
 * Comprehensive, requirement-driven, opaque-box test runner covering
 * all 4 tiers and 22 features from PROJECT.md:
 *
 *   - Tier 1: Feature Coverage (happy-path tests for each feature in isolation)
 *   - Tier 2: Boundary & Corner Cases (limits, reduced motion active, low-tier device, error shake, 0/max particles)
 *   - Tier 3: Cross-Feature Interactions (reduced motion + confetti, gestures + bottom sheets, login -> OTP shake -> checkmark, etc.)
 *   - Tier 4: Real-World Application Scenarios (12 orchestrated moments end-to-end, YouTube player zero-overlay isolation verification, checkout & celebration)
 *
 * Usage:
 *   node scripts/e2e-motion-test-runner.js
 *   node scripts/e2e-motion-test-runner.js --tier 1
 *   node scripts/e2e-motion-test-runner.js --milestone M1
 *   node scripts/e2e-motion-test-runner.js --strict
 *   node scripts/e2e-motion-test-runner.js --verbose
 *   node scripts/e2e-motion-test-runner.js --json
 */

const path = require('path');
const { runTier1Tests } = require('./motion-tests/test-tier1-features');
const { runTier2Tests } = require('./motion-tests/test-tier2-boundaries');
const { runTier3Tests } = require('./motion-tests/test-tier3-interactions');
const { runTier4Tests } = require('./motion-tests/test-tier4-scenarios');

// Parse CLI arguments
const args = process.argv.slice(2);
const options = {
  tier: null,
  milestone: null,
  strict: args.includes('--strict'),
  verbose: args.includes('--verbose'),
  json: args.includes('--json'),
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--tier' && args[i + 1]) {
    options.tier = parseInt(args[i + 1], 10);
  } else if (args[i] === '--milestone' && args[i + 1]) {
    options.milestone = args[i + 1].toUpperCase();
  }
}

function runAll() {
  const startTime = Date.now();
  const collectors = [];

  if (!options.tier || options.tier === 1) {
    collectors.push(runTier1Tests(options));
  }
  if (!options.tier || options.tier === 2) {
    collectors.push(runTier2Tests(options));
  }
  if (!options.tier || options.tier === 3) {
    collectors.push(runTier3Tests(options));
  }
  if (!options.tier || options.tier === 4) {
    collectors.push(runTier4Tests(options));
  }

  const durationMs = Date.now() - startTime;

  // Aggregate metrics
  let totalTests = 0;
  let totalPassed = 0;
  let totalPending = 0;
  let totalFailed = 0;
  const allTests = [];

  collectors.forEach((col) => {
    totalTests += col.tests.length;
    totalPassed += col.passed;
    totalPending += col.pending;
    totalFailed += col.failed;
    allTests.push(...col.tests);
  });

  // JSON Output Mode
  if (options.json) {
    const report = {
      timestamp: new Date().toISOString(),
      durationMs,
      options,
      summary: {
        total: totalTests,
        passed: totalPassed,
        pending: totalPending,
        failed: totalFailed,
        passRate: totalTests > 0 ? Math.round((totalPassed / (totalPassed + totalFailed || 1)) * 100) : 0,
      },
      tiers: collectors.map((c) => c.summary()),
      tests: allTests,
    };
    console.log(JSON.stringify(report, null, 2));
    if (totalFailed > 0 || (options.strict && totalPending > 0)) {
      process.exit(1);
    }
    process.exit(0);
  }

  // Console Human-Readable Output Mode
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║               EXPO SDK 58 E2E MOTION & INTERACTION TEST RUNNER               ║');
  console.log('║           Comprehensive 4-Tier Requirement-Driven Opaque-Box Suite           ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

  console.log(`Execution Mode: ${options.strict ? 'STRICT GATE' : 'PROGRESSIVE DUAL-TRACK'}`);
  if (options.tier) console.log(`Filter: Tier ${options.tier} Only`);
  if (options.milestone) console.log(`Filter: Milestone ${options.milestone} Only`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  // Print Tier Summary Table
  console.log('┌───────────────────────────────────────┬───────┬────────┬─────────┬────────┬──────────┐');
  console.log('│ Test Suite / Tier                     │ Total │ Passed │ Pending │ Failed │ PassRate │');
  console.log('├───────────────────────────────────────┼───────┼────────┼─────────┼────────┼──────────┤');

  collectors.forEach((col) => {
    const s = col.summary();
    const suiteNamePad = s.suite.padEnd(37, ' ').slice(0, 37);
    const totalPad = String(s.total).padStart(5, ' ');
    const passedPad = String(s.passed).padStart(6, ' ');
    const pendingPad = String(s.pending).padStart(7, ' ');
    const failedPad = String(s.failed).padStart(6, ' ');
    const ratePad = `${s.rate}%`.padStart(8, ' ');
    console.log(`│ ${suiteNamePad} │ ${totalPad} │ ${passedPad} │ ${pendingPad} │ ${failedPad} │ ${ratePad} │`);
  });

  console.log('├───────────────────────────────────────┼───────┼────────┼─────────┼────────┼──────────┤');
  const grandTotalPad = String(totalTests).padStart(5, ' ');
  const grandPassedPad = String(totalPassed).padStart(6, ' ');
  const grandPendingPad = String(totalPending).padStart(7, ' ');
  const grandFailedPad = String(totalFailed).padStart(6, ' ');
  const activeTotal = totalPassed + totalFailed;
  const grandRate = activeTotal > 0 ? Math.round((totalPassed / activeTotal) * 100) : 0;
  const grandRatePad = `${grandRate}%`.padStart(8, ' ');
  console.log(`│ TOTALS                                │ ${grandTotalPad} │ ${grandPassedPad} │ ${grandPendingPad} │ ${grandFailedPad} │ ${grandRatePad} │`);
  console.log('└───────────────────────────────────────┴───────┴────────┴─────────┴────────┴──────────┘\n');

  // Verbose or Failure Details
  if (options.verbose || totalFailed > 0) {
    console.log('────────────────────────────────────────────────────────────────────────────────');
    console.log('DETAILED TEST BREAKDOWN:');
    console.log('────────────────────────────────────────────────────────────────────────────────');
    allTests.forEach((t) => {
      const icon = t.status === 'PASSED' ? '✓' : t.status === 'PENDING' ? '○' : '✗';
      const statusLabel = `[${t.status}]`.padEnd(9, ' ');
      const msLabel = `[${t.milestone}]`.padEnd(6, ' ');
      console.log(` ${icon} ${statusLabel} ${msLabel} ${t.id.padEnd(28, ' ')} : ${t.name}`);
      if (t.error) {
        console.log(`     Error: ${t.error}`);
      } else if (t.details && (options.verbose || t.status === 'PENDING')) {
        console.log(`     Detail: ${t.details}`);
      }
    });
    console.log('');
  }

  // Milestone Progression Matrix
  console.log('MILESTONE READINESS BREAKDOWN:');
  const milestones = ['M1', 'M2', 'M3', 'M4'];
  milestones.forEach((m) => {
    const mTests = allTests.filter((t) => t.milestone === m);
    const mPassed = mTests.filter((t) => t.status === 'PASSED').length;
    const mPending = mTests.filter((t) => t.status === 'PENDING').length;
    const mFailed = mTests.filter((t) => t.status === 'FAILED').length;
    const mRate = mTests.length > 0 ? Math.round((mPassed / mTests.length) * 100) : 0;
    const status = mFailed > 0 ? '❌ FAILING' : mPending === 0 && mPassed > 0 ? '✅ 100% COMPLETE' : '⏳ IN PROGRESS';
    console.log(
      ` - ${m.padEnd(4, ' ')}: ${status.padEnd(18, ' ')} (${mPassed} passed, ${mPending} pending, ${mFailed} failed) [${mRate}%]`
    );
  });

  console.log(`\nExecution completed in ${durationMs}ms`);

  // Final Verdict
  if (totalFailed > 0) {
    console.log('\n❌ VERDICT: FAIL — Implementation defects discovered. See failure details above.\n');
    process.exit(1);
  } else if (options.strict && totalPending > 0) {
    console.log(
      `\n❌ VERDICT: STRICT GATE FAILED — ${totalPending} tests are still pending implementation.\n`
    );
    process.exit(1);
  } else {
    console.log(
      `\n✅ VERDICT: PASS — All active requirements verified successfully! (${totalPassed} passed, ${totalPending} scheduled/pending across future milestones)\n`
    );
    process.exit(0);
  }
}

runAll();
