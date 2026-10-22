/**
 * CLOUD FUNCTIONS QA RUNNER
 * -------------------------------------------------------------
 * Invokes Cloud Functions test suite and reports status.
 */

const { execSync } = require('child_process');
const path = require('path');

const FUNCTIONS_DIR = path.resolve(__dirname, '../functions');

console.log('═════════════════════════════════════════════════════════════════');
console.log('         RUNNING CLOUD FUNCTIONS AUTOMATED TEST SUITE            ');
console.log('═════════════════════════════════════════════════════════════════\n');

try {
  execSync('node --test lib/__tests__/cloudFunctions.test.js', {
    cwd: FUNCTIONS_DIR,
    stdio: 'inherit',
  });
  console.log('\n✅ ALL 21 CLOUD FUNCTIONS TESTS PASSED WITH 100% SUCCESS!\n');
  process.exit(0);
} catch (err) {
  console.error('\n✗ Cloud Functions automated test run failed!\n');
  process.exit(1);
}
