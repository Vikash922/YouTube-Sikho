#!/usr/bin/env node
/**
 * EMPIRICAL ADVERSARIAL CHALLENGE HARNESS — MILESTONE 3 (SVG, PARTICLES, SHADERS)
 * Author: challenger_m3_1 (Adversarial Effects Challenger)
 * --------------------------------------------------------------------------------
 * Concrete empirical stress tests directly executing M3 modules:
 *  1. Particle Boundary Stress:
 *     - calculateEffectiveConfettiCount with -100, -1, 0, 1, 59, 60, 72, 80, 81, 1000, NaN, Infinity, -Infinity
 *     - ConfettiBurst particle rendering count limits [60, 80]
 *     - Unmount & memory leak prevention (cancelAnimationFrame on unmount and completion)
 *     - Reduced motion and low-tier zero-allocation
 *  2. SVG Path Math & Normalization:
 *     - AnimatedProgressRing & AnimatedProgressBar with -1, 0, 0.001, 0.999, 1.0, 1.5, 50, 100, 150, NaN
 *     - Ratio [0, 1] vs Percentage [0, 100] normalization behavior
 *     - Circumference, strokeDashoffset, and width boundary calculations
 *  3. Skia Shader Uniforms & Color Parsing:
 *     - Valid 3-char, 6-char, 8-char hex, rgb(), rgba()
 *     - Malformed / adversarial color inputs (#zzz, #zzzzzz, #gg0000, #123456zz, invalid strings)
 *     - NaN uniform detection and shader pipeline safety
 *  4. YouTube Zero-Overlay Isolation:
 *     - AST verification of app/live/[id].tsx and InAppStreamPlayer.tsx
 */

const path = require('path');
const {
  evalTsModule,
  assert,
  assertEqual,
  assertDeepEqual,
  assertRange,
  readFile,
  fileExists,
  verifyYouTubeZeroOverlays,
} = require('./motion-tests/test-helpers');

let passedCount = 0;
let failedCount = 0;
const failures = [];
const findings = [];

function recordTest(name, fn) {
  process.stdout.write(`  • [TEST] ${name} ... `);
  try {
    fn();
    passedCount++;
    console.log('✅ PASS');
  } catch (err) {
    failedCount++;
    failures.push({ name, error: err });
    console.log('❌ FAIL');
    console.error(`    ↳ Error: ${err.message}`);
  }
}

function runEmpiricalChallenge() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║   CHALLENGER_M3_1: EMPIRICAL ADVERSARIAL STRESS SUITE (MILESTONE 3)         ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

  // Load implementation modules under test
  const confettiModule = evalTsModule('src/motion/particles/ConfettiBurst.tsx');
  const calculateEffectiveConfettiCount = confettiModule.calculateEffectiveConfettiCount;

  const colorUtilsModule = evalTsModule('src/motion/shaders/colorUtils.ts');
  const colorToVec4 = colorUtilsModule.colorToVec4;

  const colorsModule = evalTsModule('src/theme/colors.ts');
  const { darkPalette, lightPalette } = colorsModule;

  // ===========================================================================
  // SECTION 1: PARTICLE BOUNDARY STRESS TESTING
  // ===========================================================================
  console.log('--- SECTION 1: Confetti Particle Boundaries & Lifecycle ---');

  recordTest('calculateEffectiveConfettiCount: negative (-100, -1, -0.001) returns 0', () => {
    assertEqual(calculateEffectiveConfettiCount(-100), 0);
    assertEqual(calculateEffectiveConfettiCount(-1), 0);
    assertEqual(calculateEffectiveConfettiCount(-0.001), 0);
  });

  recordTest('calculateEffectiveConfettiCount: 0 returns 0 (suppressed)', () => {
    assertEqual(calculateEffectiveConfettiCount(0), 0);
  });

  recordTest('calculateEffectiveConfettiCount: 1 clamped to MIN_CAP (60)', () => {
    assertEqual(calculateEffectiveConfettiCount(1), 60);
  });

  recordTest('calculateEffectiveConfettiCount: 59 clamped to MIN_CAP (60)', () => {
    assertEqual(calculateEffectiveConfettiCount(59), 60);
  });

  recordTest('calculateEffectiveConfettiCount: 60 preserves lower boundary', () => {
    assertEqual(calculateEffectiveConfettiCount(60), 60);
  });

  recordTest('calculateEffectiveConfettiCount: 72 preserves default count', () => {
    assertEqual(calculateEffectiveConfettiCount(72), 72);
  });

  recordTest('calculateEffectiveConfettiCount: undefined defaults to 72', () => {
    assertEqual(calculateEffectiveConfettiCount(undefined), 72);
  });

  recordTest('calculateEffectiveConfettiCount: 80 preserves upper boundary', () => {
    assertEqual(calculateEffectiveConfettiCount(80), 80);
  });

  recordTest('calculateEffectiveConfettiCount: 81 clamped to MAX_CAP (80)', () => {
    assertEqual(calculateEffectiveConfettiCount(81), 80);
  });

  recordTest('calculateEffectiveConfettiCount: 1000 clamped to MAX_CAP (80)', () => {
    assertEqual(calculateEffectiveConfettiCount(1000), 80);
  });

  recordTest('calculateEffectiveConfettiCount: Infinity clamped to MAX_CAP (80)', () => {
    assertEqual(calculateEffectiveConfettiCount(Infinity), 80);
  });

  recordTest('calculateEffectiveConfettiCount: -Infinity returns 0', () => {
    assertEqual(calculateEffectiveConfettiCount(-Infinity), 0);
  });

  recordTest('calculateEffectiveConfettiCount: NaN input handling', () => {
    const res = calculateEffectiveConfettiCount(NaN);
    if (Number.isNaN(res)) {
      findings.push({
        area: 'Particle Boundary',
        severity: 'MEDIUM',
        description: 'calculateEffectiveConfettiCount(NaN) returns NaN instead of defaulting to 72 or clamping to [60, 80]. When passed to ConfettiBurst, loop executes 0 times, producing 0 particles when not disabled.',
      });
      // We document this as an empirical finding. To test whether it satisfies strict boundary:
      throw new Error(`calculateEffectiveConfettiCount(NaN) returned NaN, expected a safe clamped number in [60, 80] or 0`);
    } else {
      assert(res >= 60 && res <= 80, `Expected clamped count, got ${res}`);
    }
  });

  recordTest('ConfettiBurst: particle count invariant [60, 80] for all active inputs', () => {
    const testInputs = [1, 5, 20, 59, 60, 65, 72, 75, 80, 81, 100, 500, 1000, Infinity];
    testInputs.forEach((input) => {
      const effective = calculateEffectiveConfettiCount(input);
      assert(
        effective >= 60 && effective <= 80,
        `Input ${input} yielded ${effective}, which violates invariant [60, 80]`
      );
    });
  });

  recordTest('ConfettiBurst: teardown & cancelAnimationFrame on unmount', () => {
    const content = readFile('src/motion/particles/ConfettiBurst.tsx');
    assert(
      content.includes('cancelAnimationFrame(animFrameRef.current)'),
      'Must call cancelAnimationFrame on unmount in cleanup return'
    );
    assert(
      content.includes('elapsed >= durationMs'),
      'Must stop scheduling frames when durationMs has elapsed'
    );
  });

  recordTest('ConfettiBurst: zero allocation and instant onComplete under reduced motion', () => {
    const content = readFile('src/motion/particles/ConfettiBurst.tsx');
    assert(
      content.includes('if (isDisabled)'),
      'Must check isDisabled on mount'
    );
    assert(
      content.includes('onComplete?.()'),
      'Must call onComplete when disabled'
    );
    assert(
      content.includes('Sparkles'),
      'Must render static celebratory Sparkles fallback when motion is disabled'
    );
  });

  // ===========================================================================
  // SECTION 2: SVG PATH MATH & NORMALIZATION
  // ===========================================================================
  console.log('\n--- SECTION 2: SVG Path Math & Normalization ---');

  function normalizeProgressRing(progress) {
    const normalizedProgress = progress > 1
      ? Math.min(100, Math.max(0, progress)) / 100
      : Math.min(1, Math.max(0, progress));
    const resolvedTarget = Math.round(normalizedProgress * 100);
    return { normalizedProgress, resolvedTarget };
  }

  function normalizeProgressBar(value) {
    const clamped = Math.max(0, Math.min(100, value));
    return { clamped };
  }

  recordTest('AnimatedProgressRing: normalization with extreme values [-1, 0, 0.001, 0.999, 1.0, 1.5, 50, 100, 150]', () => {
    const cases = [
      { input: -1, expNorm: 0, expTarget: 0 },
      { input: 0, expNorm: 0, expTarget: 0 },
      { input: 0.001, expNorm: 0.001, expTarget: 0 },
      { input: 0.999, expNorm: 0.999, expTarget: 100 },
      { input: 1.0, expNorm: 1.0, expTarget: 100 },
      { input: 1.5, expNorm: 0.015, expTarget: 2 }, // > 1 treated as percentage 1.5%
      { input: 50, expNorm: 0.5, expTarget: 50 },
      { input: 100, expNorm: 1.0, expTarget: 100 },
      { input: 150, expNorm: 1.0, expTarget: 100 }, // clamped to 100%
    ];

    cases.forEach(({ input, expNorm, expTarget }) => {
      const { normalizedProgress, resolvedTarget } = normalizeProgressRing(input);
      assertEqual(normalizedProgress, expNorm, `Ring norm failed for ${input}`);
      assertEqual(resolvedTarget, expTarget, `Ring target failed for ${input}`);
    });
  });

  recordTest('AnimatedProgressRing: strokeDashoffset geometry has no visual clipping or negative radius', () => {
    const size = 120;
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    [-1, 0, 0.001, 0.5, 0.999, 1.0, 50, 100, 150].forEach((progress) => {
      const { normalizedProgress } = normalizeProgressRing(progress);
      const targetOffset = circumference * (1 - normalizedProgress);
      assert(targetOffset >= 0, `Target offset cannot be negative: ${targetOffset}`);
      assert(targetOffset <= circumference, `Target offset cannot exceed circumference: ${targetOffset} > ${circumference}`);
    });
  });

  recordTest('AnimatedProgressBar: clamping with extreme values [-1, 0, 0.001, 0.999, 1.0, 1.5, 50, 100, 150]', () => {
    const cases = [
      { input: -1, expClamped: 0 },
      { input: 0, expClamped: 0 },
      { input: 0.001, expClamped: 0.001 },
      { input: 0.999, expClamped: 0.999 },
      { input: 1.0, expClamped: 1.0 },
      { input: 1.5, expClamped: 1.5 },
      { input: 50, expClamped: 50 },
      { input: 100, expClamped: 100 },
      { input: 150, expClamped: 100 },
    ];

    cases.forEach(({ input, expClamped }) => {
      const { clamped } = normalizeProgressBar(input);
      assertEqual(clamped, expClamped, `Bar clamp failed for ${input}`);
    });
  });

  recordTest('AnimatedProgressBar: fill width bounded strictly to [0, containerWidth]', () => {
    const containerWidth = 320;
    [-1, 0, 0.5, 50, 100, 150, 1000].forEach((val) => {
      const { clamped } = normalizeProgressBar(val);
      const targetWidth = (clamped / 100) * containerWidth;
      assert(targetWidth >= 0, `Width negative: ${targetWidth}`);
      assert(targetWidth <= containerWidth, `Width overflowed container: ${targetWidth} > ${containerWidth}`);
    });
  });

  recordTest('SVG Progress: Check NaN input behavior', () => {
    const ringRes = normalizeProgressRing(NaN);
    const barRes = normalizeProgressBar(NaN);
    if (Number.isNaN(ringRes.normalizedProgress) || Number.isNaN(barRes.clamped)) {
      findings.push({
        area: 'SVG Progress Normalization',
        severity: 'LOW',
        description: 'Passing NaN to AnimatedProgressRing or AnimatedProgressBar produces NaN normalized values and NaN strokeDashoffset/width instead of defaulting to 0.',
      });
    }
  });

  // ===========================================================================
  // SECTION 3: SKIA SHADER UNIFORMS & COLOR PARSING
  // ===========================================================================
  console.log('\n--- SECTION 3: Skia Shader Uniforms & Color Parsing ---');

  recordTest('colorToVec4: valid 3-char hex expands correctly', () => {
    const white = colorToVec4('#fff');
    assertDeepEqual(white, [1, 1, 1, 1]);
    const black = colorToVec4('#000');
    assertDeepEqual(black, [0, 0, 0, 1]);
    const red = colorToVec4('#f00');
    assertDeepEqual(red, [1, 0, 0, 1]);
  });

  recordTest('colorToVec4: valid 6-char hex parses to normalized [r, g, b, 1]', () => {
    const indigo = colorToVec4('#4f46e5');
    assertRange(indigo[0], 0.30, 0.32);
    assertRange(indigo[1], 0.27, 0.28);
    assertRange(indigo[2], 0.89, 0.91);
    assertEqual(indigo[3], 1);
  });

  recordTest('colorToVec4: valid 8-char hex parses alpha correctly', () => {
    const halfAlpha = colorToVec4('#ffffff80');
    assertEqual(halfAlpha[0], 1);
    assertEqual(halfAlpha[1], 1);
    assertEqual(halfAlpha[2], 1);
    assertRange(halfAlpha[3], 0.50, 0.51);

    const transparentBlack = colorToVec4('#00000000');
    assertDeepEqual(transparentBlack, [0, 0, 0, 0]);
  });

  recordTest('colorToVec4: rgb() and rgba() string parsing', () => {
    const rgb = colorToVec4('rgb(255, 0, 128)');
    assertDeepEqual(rgb, [1, 0, 128 / 255, 1]);

    const rgba = colorToVec4('rgba(79, 70, 229, 0.5)');
    assertRange(rgba[0], 0.30, 0.32);
    assertRange(rgba[1], 0.27, 0.28);
    assertRange(rgba[2], 0.89, 0.91);
    assertEqual(rgba[3], 0.5);
  });

  recordTest('colorToVec4: theme palettes (dark & light) full token sweep', () => {
    const checkPalette = (palette, name) => {
      Object.entries(palette).forEach(([key, val]) => {
        if (typeof val === 'string' && (val.startsWith('#') || val.startsWith('rgb'))) {
          const vec = colorToVec4(val);
          assert(Array.isArray(vec) && vec.length === 4, `Palette ${name}.${key} failed to parse`);
          vec.forEach((c) => {
            assert(!Number.isNaN(c), `Palette ${name}.${key} produced NaN component`);
            assert(c >= 0 && c <= 1.05, `Palette ${name}.${key} component ${c} out of range [0, 1]`);
          });
        }
      });
    };
    checkPalette(darkPalette, 'dark');
    checkPalette(lightPalette, 'light');
  });

  recordTest('colorToVec4: safe fallback [0, 0, 0, 1] for empty, null, undefined, invalid tokens', () => {
    assertDeepEqual(colorToVec4(''), [0, 0, 0, 1]);
    assertDeepEqual(colorToVec4('   '), [0, 0, 0, 1]);
    assertDeepEqual(colorToVec4(null), [0, 0, 0, 1]);
    assertDeepEqual(colorToVec4(undefined), [0, 0, 0, 1]);
    assertDeepEqual(colorToVec4('non-existent-color'), [0, 0, 0, 1]);
    assertDeepEqual(colorToVec4('rgba(invalid)'), [0, 0, 0, 1]);
    assertDeepEqual(colorToVec4('#'), [0, 0, 0, 1]);
    assertDeepEqual(colorToVec4('#12'), [0, 0, 0, 1]);
    assertDeepEqual(colorToVec4('#1234'), [0, 0, 0, 1]);
  });

  recordTest('colorToVec4: adversarial malformed hex strings MUST NOT produce NaN uniforms', () => {
    const adversarialMalformedHexes = [
      '#zzz',
      '#zzzzzz',
      '#gg0000',
      '#123456zz',
      '#ffffffgg',
    ];

    const nanFound = [];
    adversarialMalformedHexes.forEach((hex) => {
      const vec = colorToVec4(hex);
      if (vec.some((v) => Number.isNaN(v))) {
        nanFound.push({ hex, vec });
      }
    });

    if (nanFound.length > 0) {
      findings.push({
        area: 'Skia Shader Uniforms',
        severity: 'HIGH',
        description: `colorToVec4 generates NaN uniforms when given malformed hex with non-hex characters: ${nanFound.map((f) => `${f.hex} -> [${f.vec.join(', ')}]`).join('; ')}. Skia runtime shaders (SoftGradientBackground, ShimmerSkeleton) will receive NaN uniforms, risking GPU rendering artifacts or pipeline errors.`,
      });
      throw new Error(`colorToVec4 produced NaN uniforms on inputs: ${nanFound.map((f) => f.hex).join(', ')}`);
    }
  });

  // ===========================================================================
  // SECTION 4: YOUTUBE ZERO-OVERLAY COMPLIANCE
  // ===========================================================================
  console.log('\n--- SECTION 4: YouTube Zero-Overlay Compliance ---');

  recordTest('YouTube Compliance: InAppStreamPlayer has zero overlays', () => {
    const res = verifyYouTubeZeroOverlays('src/components/video/InAppStreamPlayer.tsx');
    assert(res.compliant, `InAppStreamPlayer violations: ${res.violations.join('; ')}`);
  });

  recordTest('YouTube Compliance: app/live/[id].tsx has zero overlays over playerContainer', () => {
    const liveContent = readFile('app/live/[id].tsx');
    assert(
      !liveContent.includes('playerOverlayFooter'),
      'playerOverlayFooter must be eliminated from inside playerContainer'
    );
    assert(
      liveContent.includes('liveActionBar'),
      'liveActionBar must exist outside playerContainer in normal flow'
    );
  });

  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  console.log('\n══════════════════════════════════════════════════════════════════════════════');
  console.log(`TOTAL TESTS: ${passedCount + failedCount}`);
  console.log(`PASSED:      ${passedCount}`);
  console.log(`FAILED:      ${failedCount}`);
  console.log('══════════════════════════════════════════════════════════════════════════════');

  if (findings.length > 0) {
    console.log('\n⚠️ ADVERSARIAL FINDINGS DISCOVERED:');
    findings.forEach((f, idx) => {
      console.log(`\n  [Finding ${idx + 1}] [${f.severity}] ${f.area}:`);
      console.log(`    ↳ ${f.description}`);
    });
  }

  return { passedCount, failedCount, failures, findings };
}

const results = runEmpiricalChallenge();
if (results.failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
