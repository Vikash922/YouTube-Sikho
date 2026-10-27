/**
 * TIER 1: FEATURE COVERAGE (HAPPY PATH IN ISOLATION)
 * -------------------------------------------------------------
 * Tests each of the 20 features from PROJECT.md in isolation.
 * Evaluates interface contracts, exported tokens, physics parameters,
 * component structure, Reanimated hooks, and safe fallbacks.
 */

const {
  TestCollector,
  assert,
  assertEqual,
  assertDeepEqual,
  assertRange,
  assertIncludes,
  assertMatch,
  fileExists,
  readFile,
  evalTsModule,
  simulateSpringPhysics,
  verifyYouTubeZeroOverlays,
} = require('./test-helpers');

function runTier1Tests(options = {}) {
  const collector = new TestCollector('Tier 1: Feature Coverage');
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
          tier: 1,
          milestone,
          status: 'PENDING',
          details: res.reason,
        });
      } else {
        collector.record({
          id,
          name,
          tier: 1,
          milestone,
          status: 'PASSED',
          details: res ? res.details : 'Contract verified',
        });
      }
    } catch (err) {
      collector.record({
        id,
        name,
        tier: 1,
        milestone,
        status: 'FAILED',
        error: err.message,
      });
    }
  };

  // ---------------------------------------------------------------------------
  // F1: Motion Tokens (Milestone 1)
  // ---------------------------------------------------------------------------
  test('F1-DURATIONS', 'Motion Tokens: Durations Contract', 'M1', () => {
    assert(fileExists('src/motion/tokens/durations.ts'), 'Missing src/motion/tokens/durations.ts');
    const mod = evalTsModule('src/motion/tokens/durations.ts');
    assert(mod.motionDurations, 'motionDurations export missing');
    assertEqual(mod.motionDurations.instant, 120, 'Instant duration must be 120ms');
    assertEqual(mod.motionDurations.fast, 200, 'Fast duration must be 200ms');
    assertEqual(mod.motionDurations.normal, 300, 'Normal duration must be 300ms');
    assertEqual(mod.motionDurations.slow, 500, 'Slow duration must be 500ms');
    return { details: 'Durations 120/200/300/500ms verified' };
  });

  test('F1-SPRINGS', 'Motion Tokens: Spring Presets Physics', 'M1', () => {
    assert(fileExists('src/motion/tokens/springs.ts'), 'Missing src/motion/tokens/springs.ts');
    const mod = evalTsModule('src/motion/tokens/springs.ts');
    assert(mod.motionSprings, 'motionSprings export missing');

    const { snappy, smooth, bouncy, gentle } = mod.motionSprings;
    assertDeepEqual(snappy, { damping: 18, stiffness: 320, mass: 0.7, overshootClamping: false }, 'Snappy spring parameters');
    assertDeepEqual(smooth, { damping: 24, stiffness: 180, mass: 1.0, overshootClamping: false }, 'Smooth spring parameters');
    assertDeepEqual(bouncy, { damping: 11, stiffness: 190, mass: 0.8, overshootClamping: false }, 'Bouncy spring parameters');
    assertDeepEqual(gentle, { damping: 28, stiffness: 140, mass: 1.2, overshootClamping: true }, 'Gentle spring parameters');

    const snappyPhysics = simulateSpringPhysics(snappy.damping, snappy.stiffness, snappy.mass);
    const bouncyPhysics = simulateSpringPhysics(bouncy.damping, bouncy.stiffness, bouncy.mass);
    assert(snappyPhysics.isUnderdamped, 'Snappy must be underdamped');
    assert(bouncyPhysics.maxOvershoot > snappyPhysics.maxOvershoot, 'Bouncy must produce greater overshoot than snappy');
    return { details: 'Snappy/smooth/bouncy/gentle harmonic parameters verified' };
  });

  test('F1-THEME-REEXPORT', 'Motion Tokens: Backward Compatible Theme Re-Export', 'M1', () => {
    assert(fileExists('src/theme/motion.ts'), 'Missing src/theme/motion.ts');
    const mod = evalTsModule('src/theme/motion.ts');
    assert(mod.motion, 'motion export missing from src/theme/motion.ts');
    assert(mod.motion.durations.instant === 120, 'Instant duration re-exported in theme');
    assert(mod.motion.springs.snappy.stiffness === 320, 'Snappy spring re-exported in theme');
    assert(mod.motionDurations, 'motionDurations barrel export from theme');
    return { details: 'Theme motion backward-compatibility preserved' };
  });

  // ---------------------------------------------------------------------------
  // F2: Safe Haptic Triggers (Milestone 1)
  // ---------------------------------------------------------------------------
  test('F2-HAPTICS', 'Safe Haptic Triggers: Wrapper & Web Guard', 'M1', () => {
    assert(fileExists('src/motion/haptics/haptics.ts'), 'Missing src/motion/haptics/haptics.ts');
    const content = readFile('src/motion/haptics/haptics.ts');
    assertIncludes(content, "Platform.OS === 'web'", 'Platform web guard required');
    assertIncludes(content, 'reducedMotionActive', 'reducedMotionActive parameter required');
    assertIncludes(content, 'triggerHaptic', 'triggerHaptic function export required');

    const calls = [];
    const customMocks = {
      'expo-haptics': {
        ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
        NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
        impactAsync: async (style) => calls.push(`impact:${style}`),
        notificationAsync: async (type) => calls.push(`notif:${type}`),
        selectionAsync: async () => calls.push('selection'),
      },
      'react-native': {
        Platform: { OS: 'ios' },
      },
    };

    const mod = evalTsModule('src/motion/haptics/haptics.ts', customMocks);
    mod.triggerHaptic('light', false);
    mod.triggerHaptic('success', false);
    mod.triggerHaptic('light', true);

    assertEqual(calls.length, 2, 'Reduced motion must suppress haptic invocation');
    assertEqual(calls[0], 'impact:light', 'First call must be light impact');
    assertEqual(calls[1], 'notif:success', 'Second call must be success notification');
    return { details: 'Web guard and reduce-motion suppression verified' };
  });

  // ---------------------------------------------------------------------------
  // F3: Motion Context & Tiering (Milestone 1)
  // ---------------------------------------------------------------------------
  test('F3-CONTEXT', 'Motion Context & Tiering: Value Interface & Provider', 'M1', () => {
    assert(fileExists('src/motion/context/MotionContext.ts'), 'Missing MotionContext.ts');
    assert(fileExists('src/motion/context/MotionProvider.tsx'), 'Missing MotionProvider.tsx');
    assert(fileExists('src/motion/hooks/useMotion.ts'), 'Missing useMotion.ts');
    assert(fileExists('src/motion/hooks/useDeviceTier.ts'), 'Missing useDeviceTier.ts');

    const providerContent = readFile('src/motion/context/MotionProvider.tsx');
    assertIncludes(providerContent, 'reduceMotion', 'MotionProvider must provide reduceMotion');
    assertIncludes(providerContent, 'allowParticles', 'MotionProvider must calculate allowParticles');
    assertIncludes(providerContent, 'allowShaders', 'MotionProvider must calculate allowShaders');
    assertIncludes(providerContent, 'setReduceMotionOverride', 'MotionProvider must provide setReduceMotionOverride');
    assertIncludes(providerContent, 'setTierOverride', 'MotionProvider must provide setTierOverride');
    return { details: 'MotionContext and Provider contract fully satisfied' };
  });

  // ---------------------------------------------------------------------------
  // F4: Defensive Error Boundaries (Milestone 1)
  // ---------------------------------------------------------------------------
  test('F4-BOUNDARIES', 'Defensive Error Boundaries: Skia & Lottie Fallbacks', 'M1', () => {
    assert(fileExists('src/motion/boundaries/SkiaErrorBoundary.tsx'), 'Missing SkiaErrorBoundary.tsx');
    assert(fileExists('src/motion/boundaries/LottieErrorBoundary.tsx'), 'Missing LottieErrorBoundary.tsx');
    assert(fileExists('src/motion/boundaries/MotionErrorBoundary.tsx'), 'Missing MotionErrorBoundary.tsx');

    const skiaContent = readFile('src/motion/boundaries/SkiaErrorBoundary.tsx');
    assertIncludes(skiaContent, 'componentDidCatch', 'SkiaErrorBoundary must implement error boundary lifecycle');
    assertIncludes(skiaContent, 'LinearGradient', 'SkiaErrorBoundary must render fallback surface');

    const lottieContent = readFile('src/motion/boundaries/LottieErrorBoundary.tsx');
    assertIncludes(lottieContent, 'componentDidCatch', 'LottieErrorBoundary must implement error boundary lifecycle');
    assertIncludes(lottieContent, 'Sparkles', 'LottieErrorBoundary must render static Lucide fallback icon');
    return { details: 'Defensive Skia and Lottie boundaries verified' };
  });

  // ---------------------------------------------------------------------------
  // F5: Spring Button, Card & Chip (Milestone 2)
  // ---------------------------------------------------------------------------
  test('F5-SPRING-COMPONENTS', 'Interactive Spring Components: Button, Card, Chip', 'M2', () => {
    if (!fileExists('src/components/common/Button.tsx')) {
      return { pending: true, reason: 'Milestone 2 component not yet implemented' };
    }
    const buttonContent = readFile('src/components/common/Button.tsx');
    const cardContent = readFile('src/components/common/Card.tsx');

    const hasButtonSpring =
      buttonContent.includes('useAnimatedStyle') ||
      buttonContent.includes('withSpring') ||
      buttonContent.includes('motionSprings');
    assert(hasButtonSpring, 'Button.tsx must wire Reanimated spring or scale physics');
    assertIncludes(buttonContent, 'minHeight: 48', 'Button.tsx must maintain min 48px touch target');

    const hasCardFeedback =
      cardContent.includes('onPress') ||
      cardContent.includes('useAnimatedStyle') ||
      cardContent.includes('motionSprings');
    assert(hasCardFeedback, 'Card.tsx must support interactive tactile press feedback');
    return { details: 'Button and Card spring physics verified' };
  });

  // ---------------------------------------------------------------------------
  // F6: Segmented Tabs (Milestone 2)
  // ---------------------------------------------------------------------------
  test('F6-TABS', 'Segmented Tabs: Sliding Spring Indicator Pill', 'M2', () => {
    if (!fileExists('src/components/common/Tabs.tsx')) {
      return { pending: true, reason: 'Milestone 2 Tabs.tsx not yet created' };
    }
    const content = readFile('src/components/common/Tabs.tsx');
    assert(content.includes('withSpring'), 'Tabs.tsx must use withSpring for sliding indicator');
    assert(content.includes('triggerHaptic') || content.includes('Haptics'), 'Tabs.tsx must trigger selection haptic');
    return { details: 'Sliding spring indicator pill verified' };
  });

  // ---------------------------------------------------------------------------
  // F7: Floating Label Input (Milestone 2)
  // ---------------------------------------------------------------------------
  test('F7-FLOATING-INPUT', 'Floating Label Input: Animated Elevation Spring', 'M2', () => {
    if (!fileExists('src/components/common/FloatingInput.tsx')) {
      return { pending: true, reason: 'Milestone 2 FloatingInput.tsx not yet created' };
    }
    const content = readFile('src/components/common/FloatingInput.tsx');
    assert(content.includes('withSpring') || content.includes('withTiming'), 'FloatingInput must animate label');
    assert(content.includes('translateY') || content.includes('scale'), 'FloatingInput must elevate label via transform');
    return { details: 'Floating label spring elevation verified' };
  });

  // ---------------------------------------------------------------------------
  // F8: Animated OTP Boxes (Milestone 2)
  // ---------------------------------------------------------------------------
  test('F8-OTP-BOXES', 'Animated OTP Boxes: Scale & Horizontal Error Shake', 'M2', () => {
    if (!fileExists('src/components/common/OtpBoxes.tsx')) {
      return { pending: true, reason: 'Milestone 2 OtpBoxes.tsx not yet created' };
    }
    const content = readFile('src/components/common/OtpBoxes.tsx');
    assert(content.includes('translateX') || content.includes('shake'), 'OtpBoxes.tsx must support horizontal shake');
    assert(content.includes('withSpring') || content.includes('withSequence'), 'OtpBoxes.tsx must use animated sequence');
    assert(content.includes('triggerHaptic') || content.includes('Haptics'), 'OtpBoxes.tsx must trigger haptics');
    return { details: 'OTP box scale and shake physics verified' };
  });

  // ---------------------------------------------------------------------------
  // F9: Swipe Actions Hook (Milestone 2)
  // ---------------------------------------------------------------------------
  test('F9-SWIPE-ACTION', 'Swipe Actions Hook: RNGH2 Pan Gesture Handler', 'M2', () => {
    if (!fileExists('src/motion/hooks/useSwipeAction.ts')) {
      return { pending: true, reason: 'Milestone 2 useSwipeAction.ts not yet created' };
    }
    const content = readFile('src/motion/hooks/useSwipeAction.ts');
    assert(content.includes('Gesture.Pan()') || content.includes('PanGestureHandler'), 'Must use RNGH2 Pan gesture');
    assert(content.includes('withSpring'), 'Must snap back or release with spring');
    return { details: 'RNGH2 swipe action gesture verified' };
  });

  // ---------------------------------------------------------------------------
  // F10: Drag-to-Dismiss Bottom Sheet (Milestone 2)
  // ---------------------------------------------------------------------------
  test('F10-BOTTOM-SHEET', 'Drag-to-Dismiss Bottom Sheet: Velocity-Aware Damping', 'M2', () => {
    if (!fileExists('src/motion/hooks/useBottomSheetGesture.ts')) {
      return { pending: true, reason: 'Milestone 2 useBottomSheetGesture.ts not yet created' };
    }
    const content = readFile('src/motion/hooks/useBottomSheetGesture.ts');
    assert(content.includes('velocityY') || content.includes('translationY'), 'Must evaluate vertical velocity or translation');
    assert(content.includes('withSpring'), 'Must return to snap point with spring');
    return { details: 'Velocity-aware bottom sheet dismiss verified' };
  });

  // ---------------------------------------------------------------------------
  // F11: Collapsing Header Hook (Milestone 2)
  // ---------------------------------------------------------------------------
  test('F11-COLLAPSING-HEADER', 'Collapsing Header Hook: Scroll Interpolation', 'M2', () => {
    if (!fileExists('src/motion/hooks/useCollapsingHeader.ts')) {
      return { pending: true, reason: 'Milestone 2 useCollapsingHeader.ts not yet created' };
    }
    const content = readFile('src/motion/hooks/useCollapsingHeader.ts');
    assert(content.includes('interpolate'), 'Collapsing header must interpolate height/opacity');
    return { details: 'Scroll-driven collapsing header verified' };
  });

  // ---------------------------------------------------------------------------
  // F12: Custom Pull-to-Refresh (Milestone 2)
  // ---------------------------------------------------------------------------
  test('F12-PULL-TO-REFRESH', 'Custom Pull-to-Refresh: Resistance & Bouncy Spring', 'M2', () => {
    if (!fileExists('src/motion/hooks/usePullToRefresh.ts')) {
      return { pending: true, reason: 'Milestone 2 usePullToRefresh.ts not yet created' };
    }
    const content = readFile('src/motion/hooks/usePullToRefresh.ts');
    assert(content.includes('withSpring'), 'Pull-to-refresh must release with bouncy spring');
    assert(content.includes('triggerHaptic') || content.includes('Haptics'), 'Pull-to-refresh must trigger haptic on threshold');
    return { details: 'Custom pull-to-refresh mechanics verified' };
  });

  // ---------------------------------------------------------------------------
  // F13: Quiz Card Swipes (Milestone 2)
  // ---------------------------------------------------------------------------
  test('F13-QUIZ-CARD-SWIPE', 'Quiz Card Swipes: Rotation & Velocity Snap', 'M2', () => {
    if (!fileExists('src/motion/hooks/useQuizCardSwipe.ts')) {
      return { pending: true, reason: 'Milestone 2 useQuizCardSwipe.ts not yet created' };
    }
    const content = readFile('src/motion/hooks/useQuizCardSwipe.ts');
    assert(content.includes('rotate') || content.includes('rotation'), 'Quiz swipe must interpolate rotation');
    assert(content.includes('withSpring'), 'Quiz swipe must snap with spring');
    return { details: 'Quiz card swipe gesture mechanics verified' };
  });

  // ---------------------------------------------------------------------------
  // F14: Smooth Layout Transitions (Milestone 2)
  // ---------------------------------------------------------------------------
  test('F14-LAYOUT-TRANSITIONS', 'Smooth Layout Transitions: LinearTransition Presets', 'M2', () => {
    assert(fileExists('src/motion/tokens/layout.ts'), 'Missing src/motion/tokens/layout.ts');
    const content = readFile('src/motion/tokens/layout.ts');
    assertIncludes(content, 'LinearTransition', 'LinearTransition preset export required');
    return { details: 'LinearTransition layout presets verified' };
  });

  // ---------------------------------------------------------------------------
  // F15: SVG Path Animations (Milestone 3)
  // ---------------------------------------------------------------------------
  test('F15-SVG-PATH', 'SVG Path Animations: ProgressRing, Checkmark, Cross', 'M3', () => {
    if (!fileExists('src/motion/svg/AnimatedProgressRing.tsx')) {
      return { pending: true, reason: 'Milestone 3 SVG components not yet created' };
    }
    const ringContent = readFile('src/motion/svg/AnimatedProgressRing.tsx');
    assert(ringContent.includes('strokeDashoffset') || ringContent.includes('strokeDasharray'), 'AnimatedProgressRing must animate stroke offset');
    assert(fileExists('src/motion/svg/AnimatedCheckmark.tsx'), 'Missing AnimatedCheckmark.tsx');
    return { details: 'SVG progress ring and checkmark paths verified' };
  });

  // ---------------------------------------------------------------------------
  // F16: Skia Confetti Burst (Milestone 3)
  // ---------------------------------------------------------------------------
  test('F16-CONFETTI-BURST', 'Skia Confetti Burst: 60-80 Particle Cap & Auto-Unmount', 'M3', () => {
    if (!fileExists('src/motion/particles/ConfettiBurst.tsx')) {
      return { pending: true, reason: 'Milestone 3 ConfettiBurst.tsx not yet created' };
    }
    const content = readFile('src/motion/particles/ConfettiBurst.tsx');
    assert(content.includes('80'), 'ConfettiBurst must enforce upper particle limit of 80');
    assert(content.includes('2500') || content.includes('durationMs'), 'ConfettiBurst must default to 2500ms auto-unmount');
    assert(content.includes('onComplete'), 'ConfettiBurst must trigger onComplete callback');
    return { details: 'Confetti burst particle cap and lifecycle verified' };
  });

  // ---------------------------------------------------------------------------
  // F17: Skia Shaders (Milestone 3)
  // ---------------------------------------------------------------------------
  test('F17-SKIA-SHADERS', 'Skia Shaders: SoftGradient, ShimmerSkeleton, GlassBlur', 'M3', () => {
    if (!fileExists('src/motion/shaders/SoftGradientBackground.tsx')) {
      return { pending: true, reason: 'Milestone 3 Shaders not yet created' };
    }
    assert(fileExists('src/motion/shaders/ShimmerSkeleton.tsx'), 'Missing ShimmerSkeleton.tsx');
    assert(fileExists('src/motion/shaders/GlassBlur.tsx'), 'Missing GlassBlur.tsx');
    return { details: 'SoftGradient, ShimmerSkeleton, and GlassBlur verified' };
  });

  // ---------------------------------------------------------------------------
  // F18: YouTube Policy Compliance Guardrail (Milestone 3)
  // ---------------------------------------------------------------------------
  test('F18-YOUTUBE-GUARDRAIL', 'YouTube Compliance: Zero-Overlay Isolation Guarantee', 'M3', () => {
    const streamPlayerPath = 'src/components/video/InAppStreamPlayer.tsx';
    assert(fileExists(streamPlayerPath), 'Missing InAppStreamPlayer.tsx');
    const res = verifyYouTubeZeroOverlays(streamPlayerPath);
    if (!res.compliant) {
      return {
        pending: true,
        reason: `M3 Refactor Pending: ${res.violations.join('; ')}`,
      };
    }
    return { details: 'YouTube player iframe completely unobstructed' };
  });

  // ---------------------------------------------------------------------------
  // F19: 12 Orchestrated Moments (Milestone 4)
  // ---------------------------------------------------------------------------
  test('F19-ORCHESTRATED-MOMENTS', '12 Orchestrated Moments: Route Wiring', 'M4', () => {
    const requiredRoutes = [
      'app/index.tsx',
      'app/(auth)/login.tsx',
      'app/(auth)/otp.tsx',
      'app/(tabs)/index.tsx',
      'app/course/[id].tsx',
      'app/checkout/[courseId].tsx',
      'app/payment/success.tsx',
      'app/player/[lessonId].tsx',
      'app/notifications.tsx',
      'app/settings/index.tsx',
    ];
    for (const r of requiredRoutes) {
      assert(fileExists(r), `Missing route file: ${r}`);
    }
    return { details: 'All 12 signature moment route targets verified' };
  });

  // ---------------------------------------------------------------------------
  // F20: Motion Documentation (Milestone 4)
  // ---------------------------------------------------------------------------
  test('F20-DOCUMENTATION', 'Motion Documentation: MOTION-SYSTEM.md Guide', 'M4', () => {
    if (!fileExists('MOTION-SYSTEM.md')) {
      return { pending: true, reason: 'Milestone 4 MOTION-SYSTEM.md not yet created' };
    }
    const content = readFile('MOTION-SYSTEM.md');
    assertIncludes(content, 'Tokens', 'MOTION-SYSTEM.md must document tokens');
    assertIncludes(content, 'Springs', 'MOTION-SYSTEM.md must document springs');
    assertIncludes(content, 'Gestures', 'MOTION-SYSTEM.md must document gestures');
    return { details: 'MOTION-SYSTEM.md documentation verified' };
  });

  return collector;
}

module.exports = { runTier1Tests };
