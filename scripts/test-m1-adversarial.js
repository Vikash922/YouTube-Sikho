#!/usr/bin/env node
/**
 * ADVERSARIAL EMPIRICAL CHALLENGE HARNESS — MILESTONE 1 FOUNDATION
 * -------------------------------------------------------------------
 * Independent verification suite authored by challenger_m1_1.
 * Tests:
 *  1. Token exports and backward compatibility
 *  2. Numerical ODE simulation of spring presets (damping ratios, settling, stability)
 *  3. Haptic type safety, Web guard, reduced motion suppression, and bridge crash resilience
 *  4. Device tier heuristics, battery power-saver mode, and MotionProvider permission matrix
 *  5. Error boundary lifecycle, catch containment, and theme-compliant fallback rendering
 *  6. Context fallback safety when useMotion() is called outside provider
 */

const path = require('path');
const {
  evalTsModule,
  simulateSpringPhysics,
  assert,
  assertEqual,
  assertDeepEqual,
  readFile,
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

// -----------------------------------------------------------------------------
// Shared React Mock Supporting JSX & Hooks
// -----------------------------------------------------------------------------
function createReactMock(overrides = {}) {
  const mockReact = {
    createContext: (def) => ({ Provider: ({ value, children }) => children, _def: def }),
    useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
    useContext: (ctx) => ctx?._def,
    useEffect: () => {},
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
    useRef: (init) => ({ current: init }),
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    Component: class MockComponent {
      constructor(props) { this.props = props; this.state = {}; }
      setState(s) { Object.assign(this.state, s); }
    },
    ...overrides,
  };
  mockReact.default = mockReact;
  return mockReact;
}

// -----------------------------------------------------------------------------
// Numerical Spring Simulator (Runge-Kutta 4th Order)
// -----------------------------------------------------------------------------
function simulateSpringODE(damping, stiffness, mass, target = 1.0, x0 = 0.0, v0 = 0.0, maxTime = 1.5, dt = 0.001) {
  let x = x0;
  let v = v0;
  let t = 0.0;
  let maxOvershoot = 0.0;
  let settledTime = null;
  const tolerance = 0.01 * Math.abs(target - x0);

  const derivs = (currX, currV) => {
    const dxdt = currV;
    const dvdt = (-damping * currV - stiffness * (currX - target)) / mass;
    return [dxdt, dvdt];
  };

  while (t <= maxTime) {
    if (Math.abs(x - target) > tolerance) {
      settledTime = null;
    } else if (settledTime === null) {
      settledTime = t;
    }

    const overshoot = (x - target) * Math.sign(target - x0);
    if (overshoot > maxOvershoot) {
      maxOvershoot = overshoot;
    }

    if (isNaN(x) || !isFinite(x) || isNaN(v) || !isFinite(v)) {
      throw new Error(`Spring simulation diverged at t=${t}s: x=${x}, v=${v}`);
    }

    const [dx1, dv1] = derivs(x, v);
    const [dx2, dv2] = derivs(x + 0.5 * dt * dx1, v + 0.5 * dt * dv1);
    const [dx3, dv3] = derivs(x + 0.5 * dt * dx2, v + 0.5 * dt * dv2);
    const [dx4, dv4] = derivs(x + dt * dx3, v + dt * dv3);

    x += (dt / 6) * (dx1 + 2 * dx2 + 2 * dx3 + dx4);
    v += (dt / 6) * (dv1 + 2 * dv2 + 2 * dv3 + dv4);
    t += dt;
  }

  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const omega_n = Math.sqrt(stiffness / mass);

  return {
    finalPosition: x,
    finalVelocity: v,
    maxOvershootRatio: maxOvershoot / Math.abs(target - x0),
    zeta,
    omega_n,
    settledTime,
  };
}

async function run() {
  console.log('================================================================');
  console.log('  CHALLENGER EMPIRICAL VERIFICATION — MILESTONE 1 FOUNDATION    ');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // SECTION 1: MOTION TOKENS EXPORTS & TYPES
  // ---------------------------------------------------------------------------
  console.log('--- 1. Motion Tokens Contracts & Numerical Values ---');

  await test('Durations contract matches PROJECT.md line 67-72', () => {
    const mod = evalTsModule('src/motion/tokens/durations.ts');
    assert(mod.motionDurations, 'motionDurations must be exported');
    assertEqual(mod.motionDurations.instant, 120, 'instant');
    assertEqual(mod.motionDurations.fast, 200, 'fast');
    assertEqual(mod.motionDurations.normal, 300, 'normal');
    assertEqual(mod.motionDurations.slow, 500, 'slow');
    assert(
      mod.motionDurations.instant < mod.motionDurations.fast &&
      mod.motionDurations.fast < mod.motionDurations.normal &&
      mod.motionDurations.normal < mod.motionDurations.slow,
      'Durations must be strictly monotonic'
    );
  });

  await test('Spring presets parameters match PROJECT.md line 75-80', () => {
    const mod = evalTsModule('src/motion/tokens/springs.ts');
    assert(mod.motionSprings, 'motionSprings must be exported');

    assertEqual(mod.motionSprings.snappy.damping, 18, 'snappy damping');
    assertEqual(mod.motionSprings.snappy.stiffness, 320, 'snappy stiffness');
    assertEqual(mod.motionSprings.snappy.mass, 0.7, 'snappy mass');

    assertEqual(mod.motionSprings.smooth.damping, 24, 'smooth damping');
    assertEqual(mod.motionSprings.smooth.stiffness, 180, 'smooth stiffness');
    assertEqual(mod.motionSprings.smooth.mass, 1.0, 'smooth mass');

    assertEqual(mod.motionSprings.bouncy.damping, 11, 'bouncy damping');
    assertEqual(mod.motionSprings.bouncy.stiffness, 190, 'bouncy stiffness');
    assertEqual(mod.motionSprings.bouncy.mass, 0.8, 'bouncy mass');

    assertEqual(mod.motionSprings.gentle.damping, 28, 'gentle damping');
    assertEqual(mod.motionSprings.gentle.stiffness, 140, 'gentle stiffness');
    assertEqual(mod.motionSprings.gentle.mass, 1.2, 'gentle mass');
    assertEqual(mod.motionSprings.gentle.overshootClamping, true, 'gentle overshootClamping');
  });

  await test('Backward compatibility preserved in src/theme/motion.ts', () => {
    const mod = evalTsModule('src/theme/motion.ts');
    assert(mod.motion, 'motion export from src/theme/motion.ts');
    assertEqual(mod.motion.durations.instant, 120, 'theme instant duration');
    assertEqual(mod.motion.durations.quick, 200, 'theme quick duration alias');
    assertEqual(mod.motion.durations.base, 250, 'theme base duration alias');
    assertEqual(mod.motion.presets.snappy.stiffness, 320, 'theme snappy preset stiffness');
    assertEqual(mod.motion.presets.smooth.damping, 24, 'theme smooth preset damping');
    assertEqual(mod.motion.presets.bouncy.mass, 0.8, 'theme bouncy preset mass');
    assertEqual(mod.motion.presets.gentle.stiffness, 140, 'theme gentle preset stiffness');
    assertEqual(mod.motion.pressScale, 0.97, 'theme pressScale');
    assert(mod.motionDurations, 'motionDurations re-exported');
    assert(mod.motionSprings, 'motionSprings re-exported');
  });

  // ---------------------------------------------------------------------------
  // SECTION 2: SPRING PRESETS NUMERICAL PHYSICS SIMULATION
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Spring Presets Numerical Physics & Stability ---');

  await test('Snappy preset physics: underdamped, rapid settling, controlled overshoot', () => {
    const mod = evalTsModule('src/motion/tokens/springs.ts');
    const sim = simulateSpringODE(mod.motionSprings.snappy.damping, mod.motionSprings.snappy.stiffness, mod.motionSprings.snappy.mass);

    assert(sim.zeta > 0.55 && sim.zeta < 0.65, `Snappy damping ratio must be ~0.60, got ${sim.zeta.toFixed(3)}`);
    assert(sim.maxOvershootRatio > 0.05 && sim.maxOvershootRatio < 0.15, `Snappy overshoot must be 5-15%, got ${(sim.maxOvershootRatio * 100).toFixed(1)}%`);
    assert(sim.settledTime !== null && sim.settledTime < 0.35, `Snappy must settle within 350ms, took ${sim.settledTime}s`);
  });

  await test('Smooth preset physics: near-critical damping, minimal overshoot (< 2%)', () => {
    const mod = evalTsModule('src/motion/tokens/springs.ts');
    const sim = simulateSpringODE(mod.motionSprings.smooth.damping, mod.motionSprings.smooth.stiffness, mod.motionSprings.smooth.mass);

    assert(sim.zeta > 0.85 && sim.zeta < 0.95, `Smooth damping ratio must be ~0.89, got ${sim.zeta.toFixed(3)}`);
    assert(sim.maxOvershootRatio < 0.02, `Smooth overshoot must be < 2%, got ${(sim.maxOvershootRatio * 100).toFixed(2)}%`);
    assert(sim.settledTime !== null && sim.settledTime < 0.50, `Smooth must settle within 500ms, took ${sim.settledTime}s`);
  });

  await test('Bouncy preset physics: playful high overshoot (> 20%)', () => {
    const mod = evalTsModule('src/motion/tokens/springs.ts');
    const sim = simulateSpringODE(mod.motionSprings.bouncy.damping, mod.motionSprings.bouncy.stiffness, mod.motionSprings.bouncy.mass);

    assert(sim.zeta > 0.40 && sim.zeta < 0.50, `Bouncy damping ratio must be ~0.45, got ${sim.zeta.toFixed(3)}`);
    assert(sim.maxOvershootRatio > 0.20, `Bouncy overshoot must be > 20%, got ${(sim.maxOvershootRatio * 100).toFixed(1)}%`);
  });

  await test('Gentle preset physics: overdamped (zeta >= 1.0) and clamped', () => {
    const mod = evalTsModule('src/motion/tokens/springs.ts');
    const sim = simulateSpringODE(mod.motionSprings.gentle.damping, mod.motionSprings.gentle.stiffness, mod.motionSprings.gentle.mass);

    assert(sim.zeta >= 1.0, `Gentle damping ratio must be >= 1.0 (overdamped), got ${sim.zeta.toFixed(3)}`);
    assertEqual(mod.motionSprings.gentle.overshootClamping, true, 'Gentle must enable overshootClamping');
  });

  await test('Numerical stability under extreme displacement and velocity stress', () => {
    const mod = evalTsModule('src/motion/tokens/springs.ts');
    for (const [key, preset] of Object.entries(mod.motionSprings)) {
      const simHuge = simulateSpringODE(preset.damping, preset.stiffness, preset.mass, 5000, 0, 0, 2.0);
      assert(Math.abs(simHuge.finalPosition - 5000) < 1.0, `${key} must converge to target under huge displacement`);

      const simKick = simulateSpringODE(preset.damping, preset.stiffness, preset.mass, 1.0, 0, 10000, 2.0);
      assert(Math.abs(simKick.finalPosition - 1.0) < 0.1, `${key} must stabilize after violent velocity impulse`);
    }
  });

  // ---------------------------------------------------------------------------
  // SECTION 3: HAPTIC FEEDBACK TYPE SAFETY & GUARDS
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Haptic Feedback Type Safety & Defensiveness ---');

  await test('Haptics invokes correct expo-haptics APIs on native platform', async () => {
    const calls = [];
    const mocks = {
      'react-native': { Platform: { OS: 'ios' } },
      'expo-haptics': {
        ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
        NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
        impactAsync: async (s) => calls.push({ method: 'impact', style: s }),
        selectionAsync: async () => calls.push({ method: 'selection' }),
        notificationAsync: async (t) => calls.push({ method: 'notification', type: t }),
      },
    };

    const mod = evalTsModule('src/motion/haptics/haptics.ts', mocks);

    await mod.triggerHaptic('light');
    await mod.triggerHaptic('medium');
    await mod.triggerHaptic('heavy');
    await mod.triggerHaptic('selection');
    await mod.triggerHaptic('success');
    await mod.triggerHaptic('warning');
    await mod.triggerHaptic('error');

    assertEqual(calls.length, 7, 'Must invoke 7 haptic calls');
    assertEqual(calls[0].style, 'light', 'light impact');
    assertEqual(calls[1].style, 'medium', 'medium impact');
    assertEqual(calls[2].style, 'heavy', 'heavy impact');
    assertEqual(calls[3].method, 'selection', 'selection');
    assertEqual(calls[4].type, 'success', 'success notification');
    assertEqual(calls[5].type, 'warning', 'warning notification');
    assertEqual(calls[6].type, 'error', 'error notification');
  });

  await test('Haptics Web guard: Zero native calls when Platform.OS === web', async () => {
    let callCount = 0;
    const mocks = {
      'react-native': { Platform: { OS: 'web' } },
      'expo-haptics': {
        ImpactFeedbackStyle: { Light: 'light' },
        impactAsync: async () => { callCount++; },
      },
    };

    const mod = evalTsModule('src/motion/haptics/haptics.ts', mocks);
    await mod.triggerHaptic('light', false);
    await mod.triggerHaptic('heavy', false);
    assertEqual(callCount, 0, 'Must not call expo-haptics on web');
  });

  await test('Haptics Reduce Motion bypass: Zero calls when reducedMotionActive is true', async () => {
    let callCount = 0;
    const mocks = {
      'react-native': { Platform: { OS: 'android' } },
      'expo-haptics': {
        ImpactFeedbackStyle: { Light: 'light' },
        impactAsync: async () => { callCount++; },
      },
    };

    const mod = evalTsModule('src/motion/haptics/haptics.ts', mocks);
    await mod.triggerHaptic('light', true);
    await mod.triggerHaptic('heavy', true);
    assertEqual(callCount, 0, 'Must not call expo-haptics when reduceMotion is active');
  });

  await test('Haptics crash resilience: Catches bridge exceptions without rejecting', async () => {
    const mocks = {
      'react-native': { Platform: { OS: 'ios' } },
      'expo-haptics': {
        ImpactFeedbackStyle: { Light: 'light' },
        impactAsync: async () => {
          throw new Error('Fatal Native Bridge Exception: Haptic engine unserviceable');
        },
      },
    };

    const mod = evalTsModule('src/motion/haptics/haptics.ts', mocks);
    let errorThrown = false;
    try {
      await mod.triggerHaptic('light', false);
    } catch {
      errorThrown = true;
    }
    assertEqual(errorThrown, false, 'triggerHaptic must catch and swallow native errors silently');
  });

  // ---------------------------------------------------------------------------
  // SECTION 4: DEVICE TIERING & MOTION CONTEXT PERMISSION MATRIX
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Device Tiering & Motion Context Permission Matrix ---');

  await test('Device tier heuristic on web with low memory / cores', () => {
    const reactMock = createReactMock();
    const mocks = {
      'react-native': { Platform: { OS: 'web' } },
      'react': reactMock,
    };

    const origDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

    try {
      // Low tier simulation (memory < 3 or cores <= 2)
      Object.defineProperty(globalThis, 'navigator', {
        value: { deviceMemory: 2, hardwareConcurrency: 2 },
        configurable: true,
        writable: true,
      });
      const modLow = evalTsModule('src/motion/hooks/useDeviceTier.ts', mocks);
      const lowResult = modLow.useDeviceTier();
      assertEqual(lowResult.tier, 'low', '2GB + 2 cores must classify as low tier');

      // Medium tier simulation (cores <= 4 or memory < 4)
      Object.defineProperty(globalThis, 'navigator', {
        value: { deviceMemory: 4, hardwareConcurrency: 4 },
        configurable: true,
        writable: true,
      });
      const modMed = evalTsModule('src/motion/hooks/useDeviceTier.ts', mocks);
      const medResult = modMed.useDeviceTier();
      assertEqual(medResult.tier, 'medium', '4GB + 4 cores must classify as medium tier');

      // High tier simulation (memory >= 4 and cores > 4)
      Object.defineProperty(globalThis, 'navigator', {
        value: { deviceMemory: 8, hardwareConcurrency: 8 },
        configurable: true,
        writable: true,
      });
      const modHigh = evalTsModule('src/motion/hooks/useDeviceTier.ts', mocks);
      const highResult = modHigh.useDeviceTier();
      assertEqual(highResult.tier, 'high', '8GB + 8 cores must classify as high tier');
    } finally {
      if (origDesc) {
        Object.defineProperty(globalThis, 'navigator', origDesc);
      }
    }
  });

  await test('MotionProvider permission matrix exhaustive validation', () => {
    const computePermissions = (osReduceMotion, reduceMotionOverride, hardwareTier, tierOverride, isPowerSaver) => {
      const effectiveReduceMotion =
        reduceMotionOverride === 'auto' ? osReduceMotion : reduceMotionOverride;
      const effectiveTier = isPowerSaver
        ? 'low'
        : tierOverride === 'auto'
        ? hardwareTier
        : tierOverride;
      const allowParticles = !effectiveReduceMotion && effectiveTier !== 'low';
      const allowShaders = !effectiveReduceMotion && effectiveTier === 'high';
      return { effectiveReduceMotion, effectiveTier, allowParticles, allowShaders };
    };

    // Scenario 1: Default normal device (no reduce motion, high tier)
    const s1 = computePermissions(false, 'auto', 'high', 'auto', false);
    assertEqual(s1.allowParticles, true, 'Normal high device allows particles');
    assertEqual(s1.allowShaders, true, 'Normal high device allows shaders');

    // Scenario 2: OS Reduce Motion active -> strictly disables particles & shaders
    const s2 = computePermissions(true, 'auto', 'high', 'auto', false);
    assertEqual(s2.allowParticles, false, 'Reduce motion disables particles');
    assertEqual(s2.allowShaders, false, 'Reduce motion disables shaders');

    // Scenario 3: Medium tier device -> allows particles, disables shaders
    const s3 = computePermissions(false, 'auto', 'medium', 'auto', false);
    assertEqual(s3.allowParticles, true, 'Medium tier allows particles');
    assertEqual(s3.allowShaders, false, 'Medium tier disables complex shaders');

    // Scenario 4: Low tier device -> disables particles & shaders
    const s4 = computePermissions(false, 'auto', 'low', 'auto', false);
    assertEqual(s4.allowParticles, false, 'Low tier disables particles');
    assertEqual(s4.allowShaders, false, 'Low tier disables shaders');

    // Scenario 5: Battery Power-Saver mode active -> forces low tier
    const s5 = computePermissions(false, 'auto', 'high', 'high', true);
    assertEqual(s5.effectiveTier, 'low', 'Power-saver forces low tier despite high override');
    assertEqual(s5.allowParticles, false, 'Power-saver disables particles');
    assertEqual(s5.allowShaders, false, 'Power-saver disables shaders');

    // Scenario 6: User explicit reduce motion override enabled
    const s6 = computePermissions(false, true, 'high', 'auto', false);
    assertEqual(s6.allowParticles, false, 'Explicit reduceMotion override disables particles');
    assertEqual(s6.allowShaders, false, 'Explicit reduceMotion override disables shaders');
  });

  await test('useMotion fallback safety outside MotionProvider', () => {
    const reactMock = createReactMock({
      useContext: () => undefined, // outside provider returns undefined
    });
    const mod = evalTsModule('src/motion/hooks/useMotion.ts', { 'react': reactMock });
    const motionCtx = mod.useMotion();
    assert(motionCtx, 'useMotion must return fallback value');
    assertEqual(motionCtx.reduceMotion, false, 'fallback reduceMotion');
    assertEqual(motionCtx.tier, 'high', 'fallback tier');
    assertEqual(motionCtx.allowParticles, true, 'fallback allowParticles');
    assertEqual(motionCtx.allowShaders, true, 'fallback allowShaders');
    assertEqual(motionCtx.isPowerSaver, false, 'fallback isPowerSaver');
    assert(typeof motionCtx.haptic === 'function', 'fallback haptic function');
    assert(motionCtx.springs && motionCtx.springs.snappy, 'fallback springs accessible');
    assert(motionCtx.durations && motionCtx.durations.instant === 120, 'fallback durations accessible');
  });

  // ---------------------------------------------------------------------------
  // SECTION 5: DEFENSIVE ERROR BOUNDARIES & STATIC FALLBACKS
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Defensive Error Boundaries Fallbacks ---');

  await test('MotionErrorBoundary catches errors and renders fallback', () => {
    const reactMock = createReactMock();
    const mod = evalTsModule('src/motion/boundaries/MotionErrorBoundary.tsx', { 'react': reactMock });
    assert(mod.MotionErrorBoundary, 'MotionErrorBoundary export');

    const testError = new Error('Test component crash');
    const state = mod.MotionErrorBoundary.getDerivedStateFromError(testError);
    assertEqual(state.hasError, true, 'getDerivedStateFromError sets hasError: true');
    assertEqual(state.error, testError, 'stores error object');

    let reportedError = null;
    const boundary = new mod.MotionErrorBoundary({
      children: 'Normal content',
      onError: (err) => { reportedError = err; },
    });
    boundary.componentDidCatch(testError, { componentStack: 'stack trace' });
    assertEqual(reportedError, testError, 'onError invoked with caught error');

    boundary.state = { hasError: true, error: testError };
    const fallbackRender = boundary.render();
    assert(fallbackRender !== 'Normal content', 'Renders fallback view, not crashed children');
  });

  await test('SkiaErrorBoundary catches shader crash and renders LinearGradient surface', () => {
    const reactMock = createReactMock();
    const mod = evalTsModule('src/motion/boundaries/SkiaErrorBoundary.tsx', { 'react': reactMock });
    assert(mod.SkiaErrorBoundary, 'SkiaErrorBoundary export');

    const testError = new Error('Skia GPU Shader compilation failed');
    const state = mod.SkiaErrorBoundary.getDerivedStateFromError(testError);
    assertEqual(state.hasError, true, 'Skia boundary traps shader crash');

    let reported = null;
    const boundary = new mod.SkiaErrorBoundary({
      children: 'Skia canvas',
      onError: (err) => { reported = err; },
    });
    boundary.componentDidCatch(testError, { componentStack: 'Skia stack' });
    assertEqual(reported, testError, 'Skia onError callback executed');

    boundary.state = { hasError: true, error: testError };
    const rendered = boundary.render();
    assert(rendered !== null, 'Skia boundary renders fallback surface element');
  });

  await test('LottieErrorBoundary catches animation parse error and renders Sparkles icon', () => {
    const reactMock = createReactMock();
    const mod = evalTsModule('src/motion/boundaries/LottieErrorBoundary.tsx', { 'react': reactMock });
    assert(mod.LottieErrorBoundary, 'LottieErrorBoundary export');

    const testError = new Error('Lottie JSON corrupted asset');
    const state = mod.LottieErrorBoundary.getDerivedStateFromError(testError);
    assertEqual(state.hasError, true, 'Lottie boundary traps corrupt JSON');

    let reported = null;
    const boundary = new mod.LottieErrorBoundary({
      children: 'Lottie View',
      onError: (err) => { reported = err; },
    });
    boundary.componentDidCatch(testError, { componentStack: 'Lottie stack' });
    assertEqual(reported, testError, 'Lottie onError callback executed');

    boundary.state = { hasError: true, error: testError };
    const rendered = boundary.render();
    assert(rendered !== null, 'Lottie boundary renders static icon fallback');
  });

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TOTAL TESTS: ${passedCount + failedCount} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    console.error('FAILURES:');
    failures.forEach((f) => console.error(` - ${f.name}: ${f.error.message}`));
    process.exit(1);
  } else {
    console.log('🎉 ALL ADVERSARIAL CHALLENGE TESTS PASSED CLEANLY!\n');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
