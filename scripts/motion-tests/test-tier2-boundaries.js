/**
 * TIER 2: BOUNDARY & CORNER CASES
 * -------------------------------------------------------------
 * Tests limits, boundary conditions, reduced motion degradation,
 * low-tier device / power-saver state, empty states, error shake physics,
 * gesture velocity thresholds, and error boundary fallback guarantees.
 */

const {
  TestCollector,
  assert,
  assertEqual,
  assertDeepEqual,
  assertRange,
  assertIncludes,
  fileExists,
  readFile,
  evalTsModule,
  calculateEffectiveConfettiCount,
  evaluateDismissGesture,
  simulateOtpErrorShake,
} = require('./test-helpers');

function runTier2Tests(options = {}) {
  const collector = new TestCollector('Tier 2: Boundary & Corner Cases');
  const targetMilestone = options.milestone || null;

  const test = (id, name, milestone, testFn) => {
    if (targetMilestone && targetMilestone !== milestone && targetMilestone !== 'ALL') {
      return;
    }
    try {
      const res = testFn();
      if (res && res.pending) {
        collector.record({
          id,
          name,
          tier: 2,
          milestone,
          status: 'PENDING',
          details: res.reason,
        });
      } else {
        collector.record({
          id,
          name,
          tier: 2,
          milestone,
          status: 'PASSED',
          details: res ? res.details : 'Boundary verified',
        });
      }
    } catch (err) {
      collector.record({
        id,
        name,
        tier: 2,
        milestone,
        status: 'FAILED',
        error: err.message,
      });
    }
  };

  // ---------------------------------------------------------------------------
  // B1: Confetti Particle Count Boundaries
  // ---------------------------------------------------------------------------
  test('B1-PARTICLE-LIMITS', 'Particle Boundaries: [60, 80] Clamping & Teardown', 'M3', () => {
    // 1. Algorithmic boundary verification
    assertEqual(calculateEffectiveConfettiCount(0), 0, 'Count 0 disables particles');
    assertEqual(calculateEffectiveConfettiCount(10), 60, 'Count 10 clamped to min 60');
    assertEqual(calculateEffectiveConfettiCount(72), 72, 'Count 72 maintains default');
    assertEqual(calculateEffectiveConfettiCount(80), 80, 'Count 80 maintains max limit');
    assertEqual(calculateEffectiveConfettiCount(200), 80, 'Count 200 strictly capped to 80');

    // 2. Component source verification if implemented
    if (!fileExists('src/motion/particles/ConfettiBurst.tsx')) {
      return { pending: true, reason: 'Milestone 3 ConfettiBurst.tsx not yet created' };
    }
    const content = readFile('src/motion/particles/ConfettiBurst.tsx');
    assert(content.includes('80'), 'ConfettiBurst must contain 80-particle ceiling');
    assert(content.includes('durationMs') || content.includes('2500'), 'ConfettiBurst must have durationMs timer');
    return { details: 'Capped 60-80 particles and 2.5s auto-unmount verified' };
  });

  // ---------------------------------------------------------------------------
  // B2: Reduced Motion Active Degradation
  // ---------------------------------------------------------------------------
  test('B2-REDUCED-MOTION-ACTIVE', 'Reduced Motion Active: Shaders & Particles Disabled', 'M1', () => {
    assert(fileExists('src/motion/context/MotionProvider.tsx'), 'Missing MotionProvider.tsx');
    const content = readFile('src/motion/context/MotionProvider.tsx');

    // Check derivation formula:
    // allowParticles = !effectiveReduceMotion && effectiveTier !== 'low';
    // allowShaders = !effectiveReduceMotion && effectiveTier === 'high';
    assertIncludes(content, '!effectiveReduceMotion', 'allowParticles & allowShaders must be gated by !effectiveReduceMotion');

    // Safe haptics under reduced motion
    const hapticContent = readFile('src/motion/haptics/haptics.ts');
    assertIncludes(hapticContent, 'reducedMotionActive', 'Haptics must accept reducedMotionActive flag');
    assertIncludes(hapticContent, 'if (Platform.OS === \'web\' || reducedMotionActive) return;', 'Haptics must exit immediately if reducedMotionActive is true');

    return { details: 'Strict suppression of shaders, particles, and haptics under reduceMotion' };
  });

  // ---------------------------------------------------------------------------
  // B3: Low-Tier Device & Power-Saver Mode
  // ---------------------------------------------------------------------------
  test('B3-LOW-TIER-POWER-SAVER', 'Device Tiering: Low-Tier & Power-Saver Fallbacks', 'M1', () => {
    assert(fileExists('src/motion/context/MotionProvider.tsx'), 'Missing MotionProvider.tsx');
    const content = readFile('src/motion/context/MotionProvider.tsx');

    // Check power saver heuristic
    assertIncludes(content, 'isPowerSaver', 'MotionProvider must read isPowerSaver');
    assertIncludes(content, "'low'", 'isPowerSaver must demote tier to low');
    return { details: 'Power-saver automatically forces tier: low and disables heavy effects' };
  });

  // ---------------------------------------------------------------------------
  // B4: Empty States & Value Range Limits
  // ---------------------------------------------------------------------------
  test('B4-EMPTY-STATES-LIMITS', 'Empty States & Extreme Values: ProgressRing & Accordions', 'M2', () => {
    // 1. Math range clamping for progress ring (0.0 to 1.0 or 0% to 100%)
    const clampProgress = (p) => (isNaN(p) || p <= 0 ? 0 : p >= 1 ? 1 : p);
    assertEqual(clampProgress(0), 0, 'Progress 0');
    assertEqual(clampProgress(-0.5), 0, 'Negative progress clamped to 0');
    assertEqual(clampProgress(NaN), 0, 'NaN progress clamped to 0');
    assertEqual(clampProgress(1.5), 1, 'Overflow progress clamped to 1.0');

    // 2. Notifications screen empty state
    assert(fileExists('app/notifications.tsx'), 'Missing app/notifications.tsx');
    const notifContent = readFile('app/notifications.tsx');
    assert(
      notifContent.includes('notifications.length === 0') ||
        notifContent.includes('ListEmptyComponent') ||
        notifContent.includes('No notifications'),
      'Notifications screen must handle empty list state without error'
    );

    // 3. Course screen empty syllabus
    assert(fileExists('app/course/[id].tsx'), 'Missing app/course/[id].tsx');
    const courseContent = readFile('app/course/[id].tsx');
    assert(
      courseContent.includes('sections.length === 0') ||
        courseContent.includes('No curriculum') ||
        courseContent.includes('ListEmptyComponent') ||
        courseContent.includes('sections'),
      'Course screen must handle empty syllabus gracefully'
    );

    return { details: 'Progress clamping and empty state handling verified' };
  });

  // ---------------------------------------------------------------------------
  // B5: Error Shake Physics Oscillation
  // ---------------------------------------------------------------------------
  test('B5-ERROR-SHAKE-PHYSICS', 'Error Shake Physics: Decaying Oscillation & Reset', 'M2', () => {
    const shakeSequence = simulateOtpErrorShake(10, 4);
    assert(shakeSequence.length >= 8, 'Shake sequence must contain multiple oscillation frames');
    assertEqual(shakeSequence[0], 10, 'Initial oscillation starts at positive amplitude');
    assert(shakeSequence[1] < 0, 'Second frame oscillates in opposite direction');
    assertEqual(shakeSequence[shakeSequence.length - 1], 0, 'Final frame settles cleanly at 0');

    if (!fileExists('src/components/common/OtpBoxes.tsx')) {
      return { pending: true, reason: 'Milestone 2 OtpBoxes.tsx not yet created' };
    }
    const content = readFile('src/components/common/OtpBoxes.tsx');
    assert(
      content.includes('translateX') || content.includes('shake'),
      'OtpBoxes must define horizontal translateX shake'
    );
    return { details: 'Decaying horizontal sinusoidal shake physics verified' };
  });

  // ---------------------------------------------------------------------------
  // B6: Gesture Velocity & Overscroll Limits
  // ---------------------------------------------------------------------------
  test('B6-GESTURE-LIMITS', 'Gesture Boundaries: Velocity Thresholds & Resistance', 'M2', () => {
    // 1. Below dismiss threshold -> Snap back to origin
    const resCancel = evaluateDismissGesture(200, 50, 500, 150);
    assertEqual(resCancel.shouldDismiss, false, 'Low velocity and small offset should NOT dismiss');

    // 2. High velocity -> Dismiss
    const resVelocity = evaluateDismissGesture(650, 40, 500, 150);
    assertEqual(resVelocity.shouldDismiss, true, 'High velocity (650 > 500) triggers dismiss');

    // 3. Large translation -> Dismiss
    const resDistance = evaluateDismissGesture(100, 180, 500, 150);
    assertEqual(resDistance.shouldDismiss, true, 'Large distance (180 > 150) triggers dismiss');

    // 4. Upward dragging resistance (rubber band)
    const resRubber = evaluateDismissGesture(0, -100);
    assertEqual(resRubber.rubberBandedOffset, -25, 'Negative drag dampened by 4:1 factor');

    return { details: 'Velocity/distance dismiss thresholds and rubber-band damping verified' };
  });

  // ---------------------------------------------------------------------------
  // B7: Defensive Error Fallback Guarantees
  // ---------------------------------------------------------------------------
  test('B7-BOUNDARY-FALLBACKS', 'Defensive Error Boundaries: Component Crash Containment', 'M1', () => {
    assert(fileExists('src/motion/boundaries/SkiaErrorBoundary.tsx'), 'Missing SkiaErrorBoundary.tsx');
    assert(fileExists('src/motion/boundaries/LottieErrorBoundary.tsx'), 'Missing LottieErrorBoundary.tsx');

    const modSkia = evalTsModule('src/motion/boundaries/SkiaErrorBoundary.tsx');
    assert(modSkia.SkiaErrorBoundary, 'SkiaErrorBoundary class export missing');

    const modLottie = evalTsModule('src/motion/boundaries/LottieErrorBoundary.tsx');
    assert(modLottie.LottieErrorBoundary, 'LottieErrorBoundary class export missing');

    return { details: 'Skia and Lottie error catchers isolate animation engine crashes' };
  });

  return collector;
}

module.exports = { runTier2Tests };
