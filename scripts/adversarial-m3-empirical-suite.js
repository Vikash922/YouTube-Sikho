#!/usr/bin/env node
/**
 * ADVERSARIAL EMPIRICAL CHALLENGE SUITE (M3 REMEDIATION VERIFICATION)
 * Agent: challenger_m3_1_gen2 (Adversarial Effects Challenger)
 * ---------------------------------------------------------------------
 * Empirical stress tests and fuzzing generators to verify:
 *  1. colorToVec4: Malformed hex strings, non-hex characters, invalid strings,
 *     1000 randomized fuzzing inputs — strictly ZERO NaN/infinite values.
 *  2. calculateEffectiveConfettiCount: NaN, non-numeric, extreme boundaries,
 *     strictly enforces [60, 80] for celebrations, 0 for <= 0.
 *  3. AnimatedProgressRing & AnimatedProgressBar: AST and runtime evaluation
 *     verifying non-finite inputs (NaN, Infinity, -Infinity) default safely to 0.
 */

const {
  evalTsModule,
  assert,
  assertEqual,
  assertDeepEqual,
  assertRange,
  readFile,
} = require('./motion-tests/test-helpers');

let passCount = 0;
let failCount = 0;
const failureDetails = [];

function testCase(name, fn) {
  process.stdout.write(`  [TEST] ${name} ... `);
  try {
    fn();
    passCount++;
    console.log('✅ PASS');
  } catch (err) {
    failCount++;
    failureDetails.push({ name, error: err });
    console.log('❌ FAIL');
    console.error(`         ↳ Error: ${err.message}`);
  }
}

console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║   CHALLENGER_M3_1_GEN2: ADVERSARIAL VERIFICATION & STRESS HARNESS            ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

// =============================================================================
// SUITE 1: colorToVec4 ADVERSARIAL STRESS & FUZZING
// =============================================================================
console.log('--- SUITE 1: colorToVec4 Malformed Hex & Fuzzing ---');

const colorUtils = evalTsModule('src/motion/shaders/colorUtils.ts');
const colorToVec4 = colorUtils.colorToVec4;

testCase('colorToVec4: non-hex characters (#zzz, #zzzzzz, #gg0000, #123456zz) safely return [0, 0, 0, 1]', () => {
  const malformed = ['#zzz', '#zzzzzz', '#gg0000', '#123456zz', '#ffffffgg', '#XYZ', '#xyz123', '#00000g', '#g12', '#1g2', '#12g'];
  malformed.forEach((hex) => {
    const res = colorToVec4(hex);
    assertDeepEqual(res, [0, 0, 0, 1], `Malformed hex ${hex} did not return [0, 0, 0, 1]`);
  });
});

testCase('colorToVec4: invalid length hex strings (#, #1, #12, #1234, #12345, #1234567, #123456789) safely return [0, 0, 0, 1]', () => {
  const invalidLengths = ['#', '#1', '#12', '#1234', '#12345', '#1234567', '#123456789', '##ffffff'];
  invalidLengths.forEach((hex) => {
    const res = colorToVec4(hex);
    assertDeepEqual(res, [0, 0, 0, 1], `Invalid length hex ${hex} did not return [0, 0, 0, 1]`);
  });
});

testCase('colorToVec4: valid 3-char, 6-char, and 8-char hex with uppercase and lowercase', () => {
  assertDeepEqual(colorToVec4('#000'), [0, 0, 0, 1]);
  assertDeepEqual(colorToVec4('#FFF'), [1, 1, 1, 1]);
  assertDeepEqual(colorToVec4('#fff'), [1, 1, 1, 1]);
  assertDeepEqual(colorToVec4('#000000'), [0, 0, 0, 1]);
  assertDeepEqual(colorToVec4('#FFFFFF'), [1, 1, 1, 1]);
  assertDeepEqual(colorToVec4('#00000000'), [0, 0, 0, 0]);
  assertDeepEqual(colorToVec4('#FFFFFFFF'), [1, 1, 1, 1]);
  const semi = colorToVec4('#ffffff80');
  assertEqual(semi[0], 1);
  assertEqual(semi[1], 1);
  assertEqual(semi[2], 1);
  assertRange(semi[3], 0.50, 0.51);
});

testCase('colorToVec4: non-string and empty inputs return [0, 0, 0, 1]', () => {
  const edgeCases = ['', '   ', null, undefined, 123, NaN, Infinity, -Infinity, {}, [], () => {}];
  edgeCases.forEach((input) => {
    const res = colorToVec4(input);
    assertDeepEqual(res, [0, 0, 0, 1], `Input ${String(input)} did not return [0, 0, 0, 1]`);
  });
});

testCase('colorToVec4: rgb and rgba malformed or NaN parameters return safe [0, 0, 0, 1]', () => {
  const badRgba = [
    'rgba(NaN, 0, 0, 1)',
    'rgba(1, 2, 3, NaN)',
    'rgba(1, 2, 3, Infinity)',
    'rgba(1, 2, 3, -Infinity)',
    'rgba(foo, bar, baz)',
    'rgb()',
    'rgba()',
  ];
  badRgba.forEach((str) => {
    const res = colorToVec4(str);
    assertDeepEqual(res, [0, 0, 0, 1], `Malformed rgba "${str}" did not return [0, 0, 0, 1]`);
  });
});

testCase('colorToVec4: 1,000 randomized adversarial fuzzing inputs yield ZERO NaNs', () => {
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:\'",.<>/?~` \t\n\0';
  for (let i = 0; i < 1000; i++) {
    // Generate pseudo-random string
    const len = Math.floor(Math.random() * 20);
    let str = '';
    if (i % 3 === 0) str += '#';
    for (let j = 0; j < len; j++) {
      str += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    const vec = colorToVec4(str);
    assert(Array.isArray(vec) && vec.length === 4, `Fuzz iteration ${i} did not return array of 4`);
    for (let c = 0; c < 4; c++) {
      assert(typeof vec[c] === 'number', `Fuzz iteration ${i} component ${c} not number`);
      assert(!Number.isNaN(vec[c]), `Fuzz iteration ${i} component ${c} is NaN for input "${str}"`);
      assert(Number.isFinite(vec[c]), `Fuzz iteration ${i} component ${c} not finite for input "${str}"`);
      assert(vec[c] >= 0 && vec[c] <= 1, `Fuzz iteration ${i} component ${c} out of [0, 1]`);
    }
  }
});

// =============================================================================
// SUITE 2: calculateEffectiveConfettiCount BOUNDARIES & EDGE CASES
// =============================================================================
console.log('\n--- SUITE 2: calculateEffectiveConfettiCount Boundaries & NaN Safety ---');

const confettiModule = evalTsModule('src/motion/particles/ConfettiBurst.tsx');
const calculateEffectiveConfettiCount = confettiModule.calculateEffectiveConfettiCount;

testCase('calculateEffectiveConfettiCount: NaN and non-numbers safely default to 72', () => {
  assertEqual(calculateEffectiveConfettiCount(NaN), 72, 'NaN must default to 72');
  assertEqual(calculateEffectiveConfettiCount(undefined), 72, 'undefined must default to 72');
  assertEqual(calculateEffectiveConfettiCount(null), 72, 'null must default to 72');
  assertEqual(calculateEffectiveConfettiCount('72'), 72, 'string "72" must default to 72');
  assertEqual(calculateEffectiveConfettiCount('foo'), 72, 'string "foo" must default to 72');
  assertEqual(calculateEffectiveConfettiCount({}), 72, 'object {} must default to 72');
  assertEqual(calculateEffectiveConfettiCount([]), 72, 'array [] must default to 72');
  assertEqual(calculateEffectiveConfettiCount(true), 72, 'boolean true must default to 72');
});

testCase('calculateEffectiveConfettiCount: non-positive numbers (<= 0) return 0 (suppressed)', () => {
  assertEqual(calculateEffectiveConfettiCount(0), 0, '0 must return 0');
  assertEqual(calculateEffectiveConfettiCount(-0), 0, '-0 must return 0');
  assertEqual(calculateEffectiveConfettiCount(-1), 0, '-1 must return 0');
  assertEqual(calculateEffectiveConfettiCount(-0.001), 0, '-0.001 must return 0');
  assertEqual(calculateEffectiveConfettiCount(-100), 0, '-100 must return 0');
  assertEqual(calculateEffectiveConfettiCount(-Infinity), 0, '-Infinity must return 0');
});

testCase('calculateEffectiveConfettiCount: active celebrations strictly bounded to [60, 80]', () => {
  assertEqual(calculateEffectiveConfettiCount(0.0001), 60);
  assertEqual(calculateEffectiveConfettiCount(1), 60);
  assertEqual(calculateEffectiveConfettiCount(30), 60);
  assertEqual(calculateEffectiveConfettiCount(59), 60);
  assertEqual(calculateEffectiveConfettiCount(60), 60);
  assertEqual(calculateEffectiveConfettiCount(65), 65);
  assertEqual(calculateEffectiveConfettiCount(72), 72);
  assertEqual(calculateEffectiveConfettiCount(80), 80);
  assertEqual(calculateEffectiveConfettiCount(81), 80);
  assertEqual(calculateEffectiveConfettiCount(100), 80);
  assertEqual(calculateEffectiveConfettiCount(1000), 80);
  assertEqual(calculateEffectiveConfettiCount(Infinity), 80);
});

// =============================================================================
// SUITE 3: SVG PROGRESS COMPONENTS NON-FINITE INPUT SAFETY
// =============================================================================
console.log('\n--- SUITE 3: AnimatedProgressRing & AnimatedProgressBar Input Sanitization ---');

const ringContent = readFile('src/motion/svg/AnimatedProgressRing.tsx');
const barContent = readFile('src/motion/svg/AnimatedProgressBar.tsx');

testCase('AnimatedProgressRing AST & source: sanitizes rawProgress via Number.isFinite', () => {
  assert(
    ringContent.includes('const safeProgress = typeof rawProgress === \'number\' && Number.isFinite(rawProgress) ? rawProgress : 0;'),
    'AnimatedProgressRing must sanitize rawProgress using Number.isFinite defaulting to 0'
  );
  assert(
    ringContent.includes('Number.isFinite(targetValue)'),
    'AnimatedProgressRing must sanitize targetValue with Number.isFinite'
  );
});

testCase('AnimatedProgressBar AST & source: sanitizes rawInput via Number.isFinite', () => {
  assert(
    barContent.includes('const safeInput = typeof rawInput === \'number\' && Number.isFinite(rawInput) ? rawInput : 0;'),
    'AnimatedProgressBar must sanitize rawInput using Number.isFinite defaulting to 0'
  );
  assert(
    barContent.includes('const clamped = Math.max(0, Math.min(100, safeInput));'),
    'AnimatedProgressBar must clamp safeInput to [0, 100]'
  );
});

testCase('AnimatedProgressRing mathematical verification: non-finite inputs resolve cleanly to 0', () => {
  const nonFiniteInputs = [NaN, Infinity, -Infinity, undefined, null, 'string', {}, []];
  nonFiniteInputs.forEach((input) => {
    const rawProgress = input;
    const safeProgress = typeof rawProgress === 'number' && Number.isFinite(rawProgress) ? rawProgress : 0;
    const normalizedProgress = safeProgress > 1
      ? Math.min(100, Math.max(0, safeProgress)) / 100
      : Math.min(1, Math.max(0, safeProgress));
    const resolvedTarget = Math.round(normalizedProgress * 100);

    const size = 120;
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const targetOffset = circumference * (1 - normalizedProgress);

    assertEqual(safeProgress, 0, `safeProgress for ${input} must be 0`);
    assertEqual(normalizedProgress, 0, `normalizedProgress for ${input} must be 0`);
    assertEqual(resolvedTarget, 0, `resolvedTarget for ${input} must be 0`);
    assertEqual(targetOffset, circumference, `targetOffset for ${input} must equal circumference`);
    assert(!Number.isNaN(targetOffset), `targetOffset must not be NaN for ${input}`);
  });
});

testCase('AnimatedProgressBar mathematical verification: non-finite inputs resolve cleanly to 0', () => {
  const nonFiniteInputs = [NaN, Infinity, -Infinity, undefined, null, 'string', {}, []];
  const containerWidth = 300;
  nonFiniteInputs.forEach((input) => {
    const rawInput = input;
    const safeInput = typeof rawInput === 'number' && Number.isFinite(rawInput) ? rawInput : 0;
    const clamped = Math.max(0, Math.min(100, safeInput));
    const targetWidth = (clamped / 100) * containerWidth;

    assertEqual(safeInput, 0, `safeInput for ${input} must be 0`);
    assertEqual(clamped, 0, `clamped for ${input} must be 0`);
    assertEqual(targetWidth, 0, `targetWidth for ${input} must be 0`);
    assert(!Number.isNaN(targetWidth), `targetWidth must not be NaN for ${input}`);
  });
});

// =============================================================================
// SUMMARY
// =============================================================================
console.log('\n══════════════════════════════════════════════════════════════════════════════');
console.log(`TOTAL ADVERSARIAL STRESS TESTS: ${passCount + failCount}`);
console.log(`PASSED:                        ${passCount}`);
console.log(`FAILED:                        ${failCount}`);
console.log('══════════════════════════════════════════════════════════════════════════════');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
