/**
 * COMPREHENSIVE AUTOMATED TEST RUNNER
 * -------------------------------------------------------------
 * Executes:
 *  1. WCAG AA / AAA Contrast Suite across 4 client brand themes
 *  2. No-Hardcoded-Hex Theme Token Compliance Scan
 *  3. Accessibility & Minimum 48px Touch Target Audit
 *  4. Component & Theme Export Verification
 */

const { execSync } = require('child_process');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const SUITES = [
  { name: 'WCAG Contrast Verification', script: 'node scripts/test-contrast.js' },
  { name: 'No-Hardcoded-Colors Scan', script: 'node scripts/test-no-hardcoded-colors.js' },
  { name: 'Accessibility & Touch Target Audit', script: 'node scripts/test-accessibility.js' },
  { name: 'Firestore Security Rules Audit', script: 'node scripts/test-firestore-rules.js' },
  { name: 'Cloud Functions Test Suite', script: 'node scripts/test-cloud-functions.js' },
];

console.log('═════════════════════════════════════════════════════════════════');
console.log('             STARTING AUTOMATED QUALITY ASSURANCE                ');
console.log('═════════════════════════════════════════════════════════════════\n');

let passed = 0;
let failed = 0;

SUITES.forEach(({ name, script }) => {
  console.log(`▶ Running: ${name}...`);
  try {
    execSync(script, { cwd: ROOT_DIR, stdio: 'inherit' });
    console.log(`✓ ${name} PASSED\n`);
    passed++;
  } catch (err) {
    console.error(`✗ ${name} FAILED\n`);
    failed++;
  }
});

console.log('═════════════════════════════════════════════════════════════════');
console.log(`TOTAL SUITES: ${SUITES.length} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('═════════════════════════════════════════════════════════════════\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL AUTOMATED TESTS COMPLETED WITH 100% PASS RATE!\n');
  process.exit(0);
}
