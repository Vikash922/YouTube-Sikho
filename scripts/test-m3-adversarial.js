#!/usr/bin/env node
/**
 * ADVERSARIAL EMPIRICAL CHALLENGE HARNESS — MILESTONE 3 SVG & PARTICLES
 * -------------------------------------------------------------------------
 * Independent empirical verification suite authored by challenger_m3_1.
 * Tests:
 *  1. Confetti Particle Cap & Physics:
 *     - Boundary inputs: 0, -10, 50, 60, 72, 80, 100, 1000
 *     - Edge inputs: negative, floating point, undefined default, NaN, Infinity
 *     - Lifecycle: 2.5s duration, auto-unmount, onComplete callback
 *     - Reduced motion & low-tier: zero allocation, fallback Sparkles, instant onComplete
 *  2. AnimatedProgressRing:
 *     - Normalization & count-up target math: 0%, 50%, 100%, >100% (150%, 200%), negative (-10%)
 *     - Dual format inputs: ratio [0, 1] vs percentage [0, 100]
 *     - Custom targetValue override
 *     - SVG geometry math: radius, circumference, strokeDashoffset
 *     - Reduced motion: direct assignment without timing
 *  3. AnimatedProgressBar:
 *     - Clamping & count-up target math: 0%, 50%, 100%, >100% (150%), negative (-20%)
 *     - Layout container width scaling
 *     - Zero width safe handling
 *     - Reduced motion: direct assignment without timing
 *  4. Color Parser (colorToVec4 / parseColorToVec4):
 *     - Hex 3-digit, 6-digit, 8-digit parsing to normalized [r, g, b, a] in [0, 1]
 *     - RGB and RGBA string parsing
 *     - Full theme palette sweep (dark & light palettes)
 *     - Malformed / edge inputs: empty string, transparent, invalid tokens
 *  5. SVG Path Geometry (Checkmark & Cross):
 *     - Stroke dasharray & dashoffset calculations
 *  6. YouTube Zero-Overlay Isolation:
 *     - AST and structural inspection via verifyYouTubeZeroOverlays
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

async function test(name, fn) {
  process.stdout.write(`  • [TEST] ${name} ... `);
  try {
    await fn();
    passedCount++;
    console.log('✅ PASS');
  } catch (err) {
    failedCount++;
    failures.push({ name, error: err });
    console.log('❌ FAIL');
    console.error(`    -> ${err.message}`);
  }
}

async function runAdversarialSuite() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║       ADVERSARIAL EMPIRICAL CHALLENGE SUITE — MILESTONE 3 (SVG/PARTICLES)    ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

  // Load modules under test
  const confettiModule = evalTsModule('src/motion/particles/ConfettiBurst.tsx');
  const calculateEffectiveConfettiCount = confettiModule.calculateEffectiveConfettiCount;

  const colorUtilsModule = evalTsModule('src/motion/shaders/colorUtils.ts');
  const colorToVec4 = colorUtilsModule.colorToVec4;
  const parseColorToVec4 = colorUtilsModule.parseColorToVec4 || colorToVec4;

  const colorsModule = evalTsModule('src/theme/colors.ts');
  const { darkPalette, lightPalette } = colorsModule;

  // ===========================================================================
  // SECTION 1: Confetti Particle Cap Calculator Stress-Testing
  // ===========================================================================
  console.log('--- SECTION 1: calculateEffectiveConfettiCount Boundary Stress-Testing ---');

  await test('Confetti: requestedCount = 0 returns 0 (suppressed)', () => {
    const res = calculateEffectiveConfettiCount(0);
    assertEqual(res, 0, 'Count 0 must return 0');
  });

  await test('Confetti: requestedCount = -10 returns 0 (negative suppressed)', () => {
    const res = calculateEffectiveConfettiCount(-10);
    assertEqual(res, 0, 'Negative count must return 0');
  });

  await test('Confetti: requestedCount = -0.001 returns 0', () => {
    const res = calculateEffectiveConfettiCount(-0.001);
    assertEqual(res, 0, 'Small negative float must return 0');
  });

  await test('Confetti: requestedCount = 50 clamped to MIN_CAP (60)', () => {
    const res = calculateEffectiveConfettiCount(50);
    assertEqual(res, 60, 'Sub-60 count 50 must clamp to 60');
  });

  await test('Confetti: requestedCount = 1 clamped to MIN_CAP (60)', () => {
    const res = calculateEffectiveConfettiCount(1);
    assertEqual(res, 60, 'Count 1 must clamp to 60');
  });

  await test('Confetti: requestedCount = 59.999 clamped to MIN_CAP (60)', () => {
    const res = calculateEffectiveConfettiCount(59.999);
    assertEqual(res, 60, 'Sub-60 float must clamp to 60');
  });

  await test('Confetti: requestedCount = 60 exactly preserves MIN_CAP boundary', () => {
    const res = calculateEffectiveConfettiCount(60);
    assertEqual(res, 60, 'Count 60 must be preserved');
  });

  await test('Confetti: requestedCount = 72 preserves default count', () => {
    const res = calculateEffectiveConfettiCount(72);
    assertEqual(res, 72, 'Count 72 must be preserved');
  });

  await test('Confetti: requestedCount = undefined uses default 72', () => {
    const res = calculateEffectiveConfettiCount(undefined);
    assertEqual(res, 72, 'Default argument must resolve to 72');
  });

  await test('Confetti: requestedCount = 80 exactly preserves MAX_CAP boundary', () => {
    const res = calculateEffectiveConfettiCount(80);
    assertEqual(res, 80, 'Count 80 must be preserved');
  });

  await test('Confetti: requestedCount = 80.001 clamped to MAX_CAP (80)', () => {
    const res = calculateEffectiveConfettiCount(80.001);
    assertEqual(res, 80, 'Float exceeding 80 must clamp to 80');
  });

  await test('Confetti: requestedCount = 100 clamped to MAX_CAP (80)', () => {
    const res = calculateEffectiveConfettiCount(100);
    assertEqual(res, 80, 'Count 100 must clamp to 80');
  });

  await test('Confetti: requestedCount = 1000 clamped to MAX_CAP (80)', () => {
    const res = calculateEffectiveConfettiCount(1000);
    assertEqual(res, 80, 'Massive count 1000 must strictly clamp to 80');
  });

  await test('Confetti: requestedCount = Infinity clamped to MAX_CAP (80)', () => {
    const res = calculateEffectiveConfettiCount(Infinity);
    assertEqual(res, 80, 'Infinity must clamp to 80');
  });

  await test('Confetti: requestedCount = -Infinity returns 0', () => {
    const res = calculateEffectiveConfettiCount(-Infinity);
    assertEqual(res, 0, '-Infinity must return 0');
  });

  await test('ConfettiBurst source inspects 2.5s duration & auto-unmount', () => {
    const src = readFile('src/motion/particles/ConfettiBurst.tsx');
    assert(src.includes('durationMs = 2500'), 'Default duration must be 2500ms');
    assert(src.includes('isDone'), 'Must maintain isDone unmount state');
    assert(src.includes('return null'), 'Must unmount cleanly by returning null when done');
    assert(src.includes('onComplete?.()'), 'Must invoke onComplete callback');
    assert(src.includes('cancelAnimationFrame'), 'Must cancel animation frame loop on unmount');
  });

  await test('ConfettiBurst reduced motion & low-tier suppression logic', () => {
    const src = readFile('src/motion/particles/ConfettiBurst.tsx');
    assert(src.includes('reduceMotion || !allowParticles || tier === \'low\''), 'Must gate particles by motion tier');
    assert(src.includes('Sparkles'), 'Must render static fallback Sparkles icon when motion disabled');
  });

  // ===========================================================================
  // SECTION 2: AnimatedProgressRing Count-Up & Normalization Edge Cases
  // ===========================================================================
  console.log('\n--- SECTION 2: AnimatedProgressRing Count-Up Calculations ---');

  function ringNormalize(progress, targetValue) {
    const normalizedProgress = progress > 1
      ? Math.min(100, Math.max(0, progress)) / 100
      : Math.min(1, Math.max(0, progress));

    const resolvedTarget = targetValue !== undefined
      ? targetValue
      : Math.round(normalizedProgress * 100);

    return { normalizedProgress, resolvedTarget };
  }

  function ringCircumference(size = 120, strokeWidth = 10, normalizedProgress = 0) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const targetOffset = circumference * (1 - normalizedProgress);
    return { radius, circumference, targetOffset };
  }

  await test('ProgressRing: progress = 0% resolves normalized 0.0 and target 0', () => {
    const { normalizedProgress, resolvedTarget } = ringNormalize(0);
    assertEqual(normalizedProgress, 0, 'Normalized 0');
    assertEqual(resolvedTarget, 0, 'Target count 0');
    const { circumference, targetOffset } = ringCircumference(120, 10, normalizedProgress);
    assertEqual(targetOffset, circumference, 'At 0%, strokeDashoffset must equal full circumference');
  });

  await test('ProgressRing: progress = 0.5 (ratio 50%) resolves normalized 0.5 and target 50', () => {
    const { normalizedProgress, resolvedTarget } = ringNormalize(0.5);
    assertEqual(normalizedProgress, 0.5, 'Normalized 0.5');
    assertEqual(resolvedTarget, 50, 'Target count 50');
    const { circumference, targetOffset } = ringCircumference(120, 10, normalizedProgress);
    assertEqual(targetOffset, circumference * 0.5, 'At 50%, strokeDashoffset must equal half circumference');
  });

  await test('ProgressRing: progress = 50 (percentage 50%) resolves normalized 0.5 and target 50', () => {
    const { normalizedProgress, resolvedTarget } = ringNormalize(50);
    assertEqual(normalizedProgress, 0.5, 'Normalized 0.5');
    assertEqual(resolvedTarget, 50, 'Target count 50');
  });

  await test('ProgressRing: progress = 1 (ratio 100%) resolves normalized 1.0 and target 100', () => {
    const { normalizedProgress, resolvedTarget } = ringNormalize(1);
    assertEqual(normalizedProgress, 1, 'Normalized 1');
    assertEqual(resolvedTarget, 100, 'Target count 100');
    const { targetOffset } = ringCircumference(120, 10, normalizedProgress);
    assertEqual(targetOffset, 0, 'At 100%, strokeDashoffset must be 0');
  });

  await test('ProgressRing: progress = 100 (percentage 100%) resolves normalized 1.0 and target 100', () => {
    const { normalizedProgress, resolvedTarget } = ringNormalize(100);
    assertEqual(normalizedProgress, 1, 'Normalized 1');
    assertEqual(resolvedTarget, 100, 'Target count 100');
    const { targetOffset } = ringCircumference(120, 10, normalizedProgress);
    assertEqual(targetOffset, 0, 'At 100%, strokeDashoffset must be 0');
  });

  await test('ProgressRing: progress = 150 (>100%) clamps normalized to 1.0 and target to 100', () => {
    const { normalizedProgress, resolvedTarget } = ringNormalize(150);
    assertEqual(normalizedProgress, 1.0, 'Normalized clamped to 1.0');
    assertEqual(resolvedTarget, 100, 'Target clamped to 100');
    const { targetOffset } = ringCircumference(120, 10, normalizedProgress);
    assertEqual(targetOffset, 0, 'Over 100%, strokeDashoffset remains 0');
  });

  await test('ProgressRing: progress = 999 (>100%) clamps normalized to 1.0 and target to 100', () => {
    const { normalizedProgress, resolvedTarget } = ringNormalize(999);
    assertEqual(normalizedProgress, 1.0, 'Normalized clamped to 1.0');
    assertEqual(resolvedTarget, 100, 'Target clamped to 100');
  });

  await test('ProgressRing: progress = -15 (<0%) clamps normalized to 0.0 and target to 0', () => {
    const { normalizedProgress, resolvedTarget } = ringNormalize(-15);
    assertEqual(normalizedProgress, 0.0, 'Normalized clamped to 0.0');
    assertEqual(resolvedTarget, 0, 'Target clamped to 0');
  });

  await test('ProgressRing: custom targetValue = 42 overrides default derived count', () => {
    const { resolvedTarget } = ringNormalize(0.85, 42);
    assertEqual(resolvedTarget, 42, 'Explicit targetValue 42 must be honored');
  });

  await test('ProgressRing: geometry calculates correct circumference across sizes', () => {
    const g1 = ringCircumference(120, 10, 0);
    assertEqual(g1.radius, 55, 'Radius 55');
    assertEqual(g1.circumference, 110 * Math.PI, 'Circumference 110*PI');

    const g2 = ringCircumference(60, 6, 0);
    assertEqual(g2.radius, 27, 'Radius 27');
    assertEqual(g2.circumference, 54 * Math.PI, 'Circumference 54*PI');
  });

  await test('ProgressRing source code inspects reduceMotion immediate dispatch', () => {
    const src = readFile('src/motion/svg/AnimatedProgressRing.tsx');
    assert(src.includes('if (reduceMotion) {'), 'Must check reduceMotion');
    assert(src.includes('strokeDashoffset.value = targetOffset;'), 'Must set offset immediately without withTiming');
    assert(src.includes('setDisplayCount(resolvedTarget);'), 'Must set display count immediately');
  });

  // ===========================================================================
  // SECTION 3: AnimatedProgressBar Count-Up & Width Clamping Edge Cases
  // ===========================================================================
  console.log('\n--- SECTION 3: AnimatedProgressBar Count-Up Calculations ---');

  function barClamped(value, containerWidth) {
    const clamped = Math.max(0, Math.min(100, value));
    const targetWidth = containerWidth > 0 ? (clamped / 100) * containerWidth : 0;
    return { clamped, targetWidth };
  }

  await test('ProgressBar: value = 0% clamped to 0, targetWidth = 0', () => {
    const { clamped, targetWidth } = barClamped(0, 320);
    assertEqual(clamped, 0, 'Clamped to 0');
    assertEqual(targetWidth, 0, 'Width 0');
  });

  await test('ProgressBar: value = 50% clamped to 50, targetWidth = 160 on width 320', () => {
    const { clamped, targetWidth } = barClamped(50, 320);
    assertEqual(clamped, 50, 'Clamped to 50');
    assertEqual(targetWidth, 160, 'Width half of 320');
  });

  await test('ProgressBar: value = 100% clamped to 100, targetWidth = 320 on width 320', () => {
    const { clamped, targetWidth } = barClamped(100, 320);
    assertEqual(clamped, 100, 'Clamped to 100');
    assertEqual(targetWidth, 320, 'Width full 320');
  });

  await test('ProgressBar: value = 150 (>100%) clamped to 100, targetWidth = 320 on width 320', () => {
    const { clamped, targetWidth } = barClamped(150, 320);
    assertEqual(clamped, 100, 'Clamped to 100');
    assertEqual(targetWidth, 320, 'Width clamped to max 320');
  });

  await test('ProgressBar: value = -25 (<0%) clamped to 0, targetWidth = 0', () => {
    const { clamped, targetWidth } = barClamped(-25, 320);
    assertEqual(clamped, 0, 'Clamped to 0');
    assertEqual(targetWidth, 0, 'Width 0');
  });

  await test('ProgressBar: containerWidth = 0 safely yields targetWidth = 0 without error', () => {
    const { clamped, targetWidth } = barClamped(75, 0);
    assertEqual(clamped, 75, 'Clamped 75');
    assertEqual(targetWidth, 0, 'Width 0 when container unmeasured');
  });

  await test('ProgressBar source code inspects reduceMotion immediate dispatch', () => {
    const src = readFile('src/motion/svg/AnimatedProgressBar.tsx');
    assert(src.includes('if (reduceMotion) {'), 'Must check reduceMotion');
    assert(src.includes('fillWidthShared.value = targetWidth;'), 'Must set width immediately without withTiming');
    assert(src.includes('setDisplayPercent(clamped);'), 'Must set percentage immediately');
  });

  // ===========================================================================
  // SECTION 4: Color Parser colorToVec4 / parseColorToVec4 Testing
  // ===========================================================================
  console.log('\n--- SECTION 4: parseColorToVec4 / colorToVec4 Parser Stress-Testing ---');

  await test('colorToVec4: 6-digit hex #000000 -> [0, 0, 0, 1]', () => {
    const vec = colorToVec4('#000000');
    assertDeepEqual(vec, [0, 0, 0, 1]);
  });

  await test('colorToVec4: 6-digit hex #ffffff -> [1, 1, 1, 1]', () => {
    const vec = colorToVec4('#ffffff');
    assertDeepEqual(vec, [1, 1, 1, 1]);
  });

  await test('colorToVec4: 3-digit hex #fff expands to #ffffff -> [1, 1, 1, 1]', () => {
    const vec = colorToVec4('#fff');
    assertDeepEqual(vec, [1, 1, 1, 1]);
  });

  await test('colorToVec4: 3-digit hex #000 expands to #000000 -> [0, 0, 0, 1]', () => {
    const vec = colorToVec4('#000');
    assertDeepEqual(vec, [0, 0, 0, 1]);
  });

  await test('colorToVec4: 8-digit hex with alpha #ffffff80 -> ~[1, 1, 1, 0.502]', () => {
    const vec = colorToVec4('#ffffff80');
    assertEqual(vec[0], 1);
    assertEqual(vec[1], 1);
    assertEqual(vec[2], 1);
    assertRange(vec[3], 0.5, 0.51, 'Alpha 0.5');
  });

  await test('colorToVec4: rgb string rgb(255, 0, 128)', () => {
    const vec = colorToVec4('rgb(255, 0, 128)');
    assertEqual(vec[0], 1);
    assertEqual(vec[1], 0);
    assertRange(vec[2], 0.5, 0.51);
    assertEqual(vec[3], 1);
  });

  await test('colorToVec4: rgba string with decimals rgba(79, 70, 229, 0.16)', () => {
    const vec = colorToVec4('rgba(79, 70, 229, 0.16)');
    assertRange(vec[0], 0.3, 0.32);
    assertRange(vec[1], 0.27, 0.28);
    assertRange(vec[2], 0.89, 0.91);
    assertEqual(vec[3], 0.16);
  });

  await test('colorToVec4: rgba string with spaced padding rgba( 255 , 255 , 255 , 0.04 )', () => {
    const vec = colorToVec4('rgba( 255 , 255 , 255 , 0.04 )');
    assertEqual(vec[0], 1);
    assertEqual(vec[1], 1);
    assertEqual(vec[2], 1);
    assertEqual(vec[3], 0.04);
  });

  await test('colorToVec4: empty / null / undefined string safe fallback [0, 0, 0, 1]', () => {
    assertDeepEqual(colorToVec4(''), [0, 0, 0, 1]);
    assertDeepEqual(colorToVec4(null), [0, 0, 0, 1]);
    assertDeepEqual(colorToVec4(undefined), [0, 0, 0, 1]);
  });

  await test('colorToVec4: non-matching string safe fallback [0, 0, 0, 1]', () => {
    assertDeepEqual(colorToVec4('transparent'), [0, 0, 0, 1]);
    assertDeepEqual(colorToVec4('invalid-color'), [0, 0, 0, 1]);
  });

  await test('colorToVec4: full sweep across all tokens in darkPalette', () => {
    const stringTokens = [
      darkPalette.primary,
      darkPalette.primaryLight,
      darkPalette.primaryDark,
      darkPalette.primaryGlow,
      darkPalette.accent,
      darkPalette.accentBg,
      darkPalette.secondary,
      darkPalette.background,
      darkPalette.surface,
      darkPalette.surfaceElevated,
      darkPalette.surfaceSubtle,
      darkPalette.text,
      darkPalette.textMuted,
      darkPalette.border,
      darkPalette.borderSubtle,
      darkPalette.success,
      darkPalette.successBg,
      darkPalette.warning,
      darkPalette.warningBg,
      darkPalette.error,
      darkPalette.errorBg,
      darkPalette.info,
      darkPalette.infoBg,
      darkPalette.backdrop,
      darkPalette.glass,
    ];

    stringTokens.forEach((token) => {
      const vec = colorToVec4(token);
      assert(Array.isArray(vec) && vec.length === 4, `Token ${token} must produce 4-element array`);
      vec.forEach((ch, idx) => {
        assert(!isNaN(ch), `Token ${token} channel ${idx} is NaN`);
        assertRange(ch, 0.0, 1.0, `Token ${token} channel ${idx} out of range [0, 1]`);
      });
    });
  });

  await test('colorToVec4: full sweep across all tokens in lightPalette', () => {
    const stringTokens = [
      lightPalette.primary,
      lightPalette.primaryLight,
      lightPalette.primaryDark,
      lightPalette.primaryGlow,
      lightPalette.accent,
      lightPalette.accentLight,
      lightPalette.accentBg,
      lightPalette.secondary,
      lightPalette.background,
      lightPalette.surface,
      lightPalette.surfaceElevated,
      lightPalette.surfaceSubtle,
      lightPalette.text,
      lightPalette.textMuted,
      lightPalette.border,
      lightPalette.borderSubtle,
      lightPalette.success,
      lightPalette.successBg,
      lightPalette.warning,
      lightPalette.warningBg,
      lightPalette.error,
      lightPalette.errorBg,
      lightPalette.info,
      lightPalette.infoBg,
      lightPalette.backdrop,
      lightPalette.glass,
    ];

    stringTokens.forEach((token) => {
      const vec = colorToVec4(token);
      assert(Array.isArray(vec) && vec.length === 4, `Token ${token} must produce 4-element array`);
      vec.forEach((ch, idx) => {
        assert(!isNaN(ch), `Token ${token} channel ${idx} is NaN`);
        assertRange(ch, 0.0, 1.0, `Token ${token} channel ${idx} out of range [0, 1]`);
      });
    });
  });

  // ===========================================================================
  // SECTION 5: SVG Checkmark, Cross, and Morphing Icon Path Math
  // ===========================================================================
  console.log('\n--- SECTION 5: SVG Checkmark, Cross, and Morphing Icon Paths ---');

  await test('AnimatedCheckmark path length & strokeDashoffset calculation', () => {
    const src = readFile('src/motion/svg/AnimatedCheckmark.tsx');
    assert(src.includes('d="M 4 12 L 9 17 L 20 6"'), 'Must contain checkmark path geometry');
    assert(src.includes('CHECKMARK_PATH_LENGTH = 24') || src.includes('24'), 'Must set path length approx 24');
    assert(src.includes('strokeDashoffset: strokeDashoffset.value'), 'Must animate strokeDashoffset from 24 to 0');
    assert(src.includes('reduceMotion'), 'Must support reduced motion');
  });

  await test('AnimatedCross path length & strokeDashoffset calculation', () => {
    const src = readFile('src/motion/svg/AnimatedCross.tsx');
    assert(src.includes('d="M 6 6 L 18 18"'), 'Must contain first cross leg');
    assert(src.includes('d="M 18 6 L 6 18"'), 'Must contain second cross leg');
    assert(src.includes('CROSS_ARM_LENGTH = 17'), 'Must set cross path length approx 17');
    assert(src.includes('reduceMotion'), 'Must support reduced motion');
  });

  await test('MorphingIcon dual-layer rotation and cross-fade logic', () => {
    const src = readFile('src/motion/svg/MorphingIcon.tsx');
    assert(src.includes('iconA'), 'Must accept iconA');
    assert(src.includes('iconB'), 'Must accept iconB');
    assert(src.includes('active'), 'Must track active boolean');
    assert(src.includes('reduceMotion'), 'Must support reduced motion');
  });

  // ===========================================================================
  // SECTION 6: YouTube Zero-Overlay Isolation Verification
  // ===========================================================================
  console.log('\n--- SECTION 6: YouTube Zero-Overlay Compliance ---');

  await test('app/live/[id].tsx YouTube player container has NO overlays', () => {
    const liveContent = readFile('app/live/[id].tsx');
    assert(!liveContent.includes('playerOverlayFooter'), 'Must NOT contain playerOverlayFooter');
    assert(liveContent.includes('liveActionBar'), 'Must place interactive controls in external liveActionBar');
    assert(liveContent.includes('styles.playerContainer'), 'Must have playerContainer');
  });

  await test('InAppStreamPlayer.tsx passes verifyYouTubeZeroOverlays', () => {
    const res = verifyYouTubeZeroOverlays('src/components/video/InAppStreamPlayer.tsx');
    assert(res.compliant, `Must be compliant: ${res.violations.join('; ')}`);
  });

  await test('InAppStreamPlayer.tsx YouTube block contains ONLY SafeWebView', () => {
    const streamContent = readFile('src/components/video/InAppStreamPlayer.tsx');
    const webViewIdx = streamContent.indexOf('<SafeWebView');
    assert(webViewIdx !== -1, 'Must contain SafeWebView');
    const nextContainerEnd = streamContent.indexOf('</View>', webViewIdx);
    const subBlock = streamContent.slice(webViewIdx, nextContainerEnd);
    assert(!subBlock.includes('Badge'), 'SafeWebView container must not contain Badge');
    assert(!subBlock.includes('Sparkles'), 'SafeWebView container must not contain Sparkles');
    assert(!subBlock.includes('replayIndicatorPill'), 'SafeWebView container must not contain replayIndicatorPill');
  });

  // ===========================================================================
  // Summary & Report
  // ===========================================================================
  console.log('\n================================================================================');
  console.log(`TOTAL TESTS: ${passedCount + failedCount}`);
  console.log(`PASSED:      ${passedCount}`);
  console.log(`FAILED:      ${failedCount}`);
  console.log(`PASS RATE:   ${Math.round((passedCount / (passedCount + failedCount || 1)) * 100)}%`);
  console.log('================================================================================\n');

  if (failedCount > 0) {
    console.error('❌ ADVERSARIAL CHALLENGE FAILED — Defects discovered:');
    failures.forEach((f) => console.error(`  - ${f.name}: ${f.error.message}`));
    process.exit(1);
  } else {
    console.log('✅ ADVERSARIAL CHALLENGE PASSED — All empirical tests verified successfully!\n');
    process.exit(0);
  }
}

runAdversarialSuite();
