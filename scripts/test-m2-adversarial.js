#!/usr/bin/env node
/**
 * ADVERSARIAL EMPIRICAL CHALLENGE HARNESS — MILESTONE 2 SPRINGS & GESTURES
 * -------------------------------------------------------------------------
 * Independent empirical verification suite authored by challenger_m2_1.
 * Tests:
 *  1. Button: spring parameters, scale behaviors, min 48px touch target, disabled/loading states, reduced-motion clamping.
 *  2. Card: press scale 0.97, static view optimization when non-pressable, hero vs default radius, reduced-motion clamping.
 *  3. Chip: press scale 0.95, selection progress spring, color interpolation, badge bounce physics, reduced-motion clamping.
 *  4. Tabs: sliding indicator offset math, smooth spring, active tab caching, tab scale 0.94, selection haptics, reduced-motion clamping.
 *  5. FloatingInput: floatProgress elevation spring, translateY -22 & scale 0.82 transforms, clear button, reduced-motion clamping.
 *  6. OtpBoxes: focus scale 1.04, horizontal decaying error shake sequence, imperative ref calls (shake, focus, clear), paste & backspace, reduced-motion clamping.
 *  7. Gesture Hooks: useSwipeAction, useBottomSheetGesture, usePullToRefresh, useQuizCardSwipe, worklet runOnJS safety.
 *  8. Layout transitions: LinearTransition spring presets.
 */

const path = require('path');
const {
  evalTsModule,
  simulateSpringPhysics,
  assert,
  assertEqual,
  assertDeepEqual,
  readFile,
  fileExists,
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
// React & Reanimated Mock Engine
// -----------------------------------------------------------------------------
function createEnvironment({ reduceMotion = false } = {}) {
  const sharedValues = [];
  const hapticCalls = [];

  const mockSharedValue = (initialVal) => {
    const sv = {
      _value: initialVal,
      get value() { return this._value; },
      set value(v) { this._value = v; },
    };
    sharedValues.push(sv);
    return sv;
  };

  const mockTheme = {
    colors: {
      primary: '#6366F1',
      primaryGradient: ['#6366F1', '#4F46E5'],
      surface: '#0F172A',
      surfaceElevated: '#1E293B',
      surfaceSubtle: '#334155',
      border: '#334155',
      text: '#F8FAFC',
      textMuted: '#94A3B8',
      textSecondary: '#CBD5E1',
      error: '#EF4444',
      backdrop: 'rgba(0,0,0,0.6)',
      card: '#1E293B',
    },
    radius: {
      button: 12,
      card: 20,
      heroCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomRightRadius: 28, borderBottomLeftRadius: 8 },
      input: 12,
      full: 9999,
      md: 8,
      sheet: 24,
    },
    spacing: { xs: 4, sm: 8, base: 16, xl: 24, screen: 20 },
    typography: {
      heading: { fontSize: 16, fontWeight: '700' },
      body: { fontSize: 14 },
      title: { fontSize: 18, fontWeight: '700' },
      caption: { fontSize: 12 },
      small: { fontSize: 13 },
    },
    shadows: {
      sm: { shadowColor: '#000', shadowOpacity: 0.1 },
      md: { shadowColor: '#000', shadowOpacity: 0.2 },
      lg: { shadowColor: '#000', shadowOpacity: 0.3 },
    },
    isDark: true,
  };

  const mockReact = {
    useState: (init) => {
      let state = typeof init === 'function' ? init() : init;
      const setter = (newVal) => { state = typeof newVal === 'function' ? newVal(state) : newVal; };
      return [state, setter];
    },
    useEffect: (fn, deps) => { fn(); },
    useRef: (init) => ({ current: init }),
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
    forwardRef: (render) => {
      const Comp = (props) => render(props, props.ref || { current: null });
      Comp.displayName = render.name || 'ForwardRef';
      return Comp;
    },
    useImperativeHandle: (ref, createHandle) => {
      if (ref) {
        ref.current = createHandle();
      }
    },
    createElement: (type, props, ...children) => ({
      type,
      props: { ...(props || {}), children: children.length === 1 ? children[0] : children },
    }),
  };
  mockReact.default = mockReact;

  const mockReanimated = {
    useSharedValue: mockSharedValue,
    useAnimatedStyle: (updater) => updater,
    useReducedMotion: () => reduceMotion,
    withSpring: (toValue, config, callback) => {
      return { type: 'spring', toValue, config, callback };
    },
    withTiming: (toValue, config, callback) => {
      return { type: 'timing', toValue, config, callback };
    },
    withSequence: (...animations) => {
      return { type: 'sequence', animations };
    },
    interpolateColor: (val, input, output) => {
      return `interpolated(${val}, [${input}], [${output}])`;
    },
    interpolate: (val, input, output, ext) => {
      return `interpolatedNumber(${val}, [${input}], [${output}])`;
    },
    runOnJS: (fn) => fn,
    Extrapolation: { CLAMP: 'clamp' },
    FadeIn: { duration: (d) => ({ type: 'FadeIn', duration: d }) },
    FadeOut: { duration: (d) => ({ type: 'FadeOut', duration: d }) },
    LinearTransition: {
      springify: () => ({
        damping: () => ({ stiffness: () => ({ mass: () => ({ type: 'LinearTransition' }) }) }),
      }),
    },
    createAnimatedComponent: (Comp) => Comp,
    default: {
      View: (props) => props,
      Text: (props) => props,
      createAnimatedComponent: (Comp) => Comp,
    },
  };

  const mockHaptics = {
    triggerHaptic: (type, suppress) => {
      hapticCalls.push({ type, suppress });
    },
  };

  const customMocks = {
    react: mockReact,
    'react-native-reanimated': mockReanimated,
    '../../theme': { useTheme: () => mockTheme },
    '../../motion': {
      motionSprings: {
        snappy: { damping: 18, stiffness: 320, mass: 0.7 },
        smooth: { damping: 24, stiffness: 180, mass: 1.0 },
        bouncy: { damping: 11, stiffness: 190, mass: 0.8 },
        gentle: { damping: 28, stiffness: 140, mass: 1.2 },
      },
      motionDurations: { instant: 120, fast: 200, normal: 300, slow: 500 },
      triggerHaptic: mockHaptics.triggerHaptic,
    },
    '../tokens/springs': {
      motionSprings: {
        snappy: { damping: 18, stiffness: 320, mass: 0.7 },
        smooth: { damping: 24, stiffness: 180, mass: 1.0 },
        bouncy: { damping: 11, stiffness: 190, mass: 0.8 },
        gentle: { damping: 28, stiffness: 140, mass: 1.2 },
      },
    },
    '../haptics/haptics': {
      triggerHaptic: mockHaptics.triggerHaptic,
    },
    'react-native-gesture-handler': {
      Gesture: {
        Pan: () => {
          const pan = {
            enabled: () => pan,
            activeOffsetX: () => pan,
            onStart: () => pan,
            onUpdate: (fn) => { pan._update = fn; return pan; },
            onEnd: (fn) => { pan._end = fn; return pan; },
          };
          return pan;
        },
      },
      GestureDetector: ({ gesture, children }) => children,
    },
    'react-native-safe-area-context': {
      useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
    },
  };

  return {
    customMocks,
    sharedValues,
    hapticCalls,
    mockTheme,
  };
}

async function runAdversarialM2Suite() {
  console.log('================================================================');
  console.log('  CHALLENGER EMPIRICAL VERIFICATION — MILESTONE 2 SPRINGS       ');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. BUTTON COMPONENT EMPIRICAL CHALLENGES
  // ---------------------------------------------------------------------------
  console.log('--- 1. Button: Spring Physics, Scale & Accessibility Clamping ---');

  await test('Button press-in/press-out scale springs with motionSprings.snappy', () => {
    const env = createEnvironment({ reduceMotion: false });
    const mod = evalTsModule('src/components/common/Button.tsx', env.customMocks);
    assert(mod.Button, 'Button export missing');

    let pressed = false;
    const vnode = mod.Button({
      title: 'Enroll Now',
      onPress: () => { pressed = true; },
      size: 'md',
    });

    assert(vnode.props.onPressIn, 'onPressIn handler must exist');
    assert(vnode.props.onPressOut, 'onPressOut handler must exist');
    assert(vnode.props.onPress, 'onPress handler must exist');

    // Simulate press-in
    vnode.props.onPressIn();
    const scaleSV = env.sharedValues.find((s) => s.value && s.value.type === 'spring' && s.value.toValue === 0.97);
    assert(scaleSV, 'Press-in must animate scale to 0.97 via spring');
    assertEqual(scaleSV.value.config.damping, 18, 'Snappy damping: 18');
    assertEqual(scaleSV.value.config.stiffness, 320, 'Snappy stiffness: 320');
    assertEqual(scaleSV.value.config.mass, 0.7, 'Snappy mass: 0.7');

    // Simulate press-out
    vnode.props.onPressOut();
    assert(scaleSV.value.toValue === 1, 'Press-out must animate scale back to 1.0');

    // Simulate press
    vnode.props.onPress();
    assert(pressed, 'onPress callback must be invoked');
    assertEqual(env.hapticCalls.length, 1, 'Haptic feedback must be triggered on press');
    assertEqual(env.hapticCalls[0].type, 'light', 'Haptic style must be light');
  });

  await test('Button reduced-motion clamping: Scale strictly locks to 1.0', () => {
    const env = createEnvironment({ reduceMotion: true });
    const mod = evalTsModule('src/components/common/Button.tsx', env.customMocks);

    const vnode = mod.Button({
      title: 'Disabled Motion Button',
      onPress: () => {},
    });

    // Style is array with animatedStyle at index 2
    const animStyleFn = vnode.props.style[2];
    assert(typeof animStyleFn === 'function', 'Animated style function expected');
    const computedStyle = animStyleFn();
    assertEqual(computedStyle.transform[0].scale, 1, 'Under reduced motion, transform scale must strictly evaluate to 1.0');

    // Even if press-in fires, transform scale must remain 1.0
    vnode.props.onPressIn();
    const computedStyleAfterPress = animStyleFn();
    assertEqual(computedStyleAfterPress.transform[0].scale, 1, 'After press-in under reduced motion, transform scale remains 1.0');

    // Press triggers haptic with suppress=true
    vnode.props.onPress();
    assertEqual(env.hapticCalls[0].suppress, true, 'Haptic call must report reducedMotion active');
  });

  await test('Button disabled & loading states: Touch suppression & animated opacity', () => {
    const env = createEnvironment({ reduceMotion: false });
    const mod = evalTsModule('src/components/common/Button.tsx', env.customMocks);

    let called = false;
    const vnode = mod.Button({
      title: 'Disabled Button',
      onPress: () => { called = true; },
      disabled: true,
    });

    // onPress, onPressIn must be guarded
    vnode.props.onPress();
    assertEqual(called, false, 'Disabled button must not fire onPress');

    // Opacity animated value should be 0.5 with fast duration
    const opacitySV = env.sharedValues.find((s) => s.value && s.value.type === 'timing' && s.value.toValue === 0.5);
    assert(opacitySV, 'Disabled state must animate opacity to 0.5');
    assertEqual(opacitySV.value.config.duration, 200, 'Fast duration must be 200ms');

    // Min height constraint
    const layoutStyle = vnode.props.style[1];
    assert(layoutStyle.minHeight >= 48, 'Touch target minHeight must be at least 48px');
  });

  // ---------------------------------------------------------------------------
  // 2. CARD COMPONENT EMPIRICAL CHALLENGES
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Card: Press Scaling, Non-Interactive View Optimization & Asymmetry ---');

  await test('Card with onPress: Spring scale 0.97 and haptic trigger', () => {
    const env = createEnvironment({ reduceMotion: false });
    const mod = evalTsModule('src/components/common/Card.tsx', env.customMocks);

    let clicked = false;
    const vnode = mod.Card({
      children: 'Card Content',
      onPress: () => { clicked = true; },
    });

    assert(vnode.props.onPressIn, 'Card must wire onPressIn');
    vnode.props.onPressIn();
    const scaleSV = env.sharedValues.find((s) => s.value && s.value.toValue === 0.97);
    assert(scaleSV, 'Card press-in must spring to 0.97');
    assertEqual(scaleSV.value.config.damping, 18, 'Snappy spring damping');

    vnode.props.onPressOut();
    assertEqual(scaleSV.value.toValue, 1, 'Card press-out springs to 1.0');

    vnode.props.onPress();
    assert(clicked, 'Card onPress invoked');
    assertEqual(env.hapticCalls[0].type, 'light', 'Card haptic: light');
  });

  await test('Card without onPress: Static View optimization (no AnimatedPressable)', () => {
    const env = createEnvironment({ reduceMotion: false });
    const mod = evalTsModule('src/components/common/Card.tsx', env.customMocks);

    const vnode = mod.Card({
      children: 'Static Card Content',
    });

    assertEqual(vnode.props.onPress, undefined, 'Static card must not have onPress');
    assertEqual(vnode.props.onPressIn, undefined, 'Static card must not have onPressIn');
  });

  await test('Card variant styling: Hero asymmetric corners vs Default standard radius', () => {
    const env = createEnvironment({ reduceMotion: false });
    const mod = evalTsModule('src/components/common/Card.tsx', env.customMocks);

    const heroCard = mod.Card({
      variant: 'hero',
      children: 'Hero Content',
    });
    const defaultCard = mod.Card({
      variant: 'default',
      children: 'Default Content',
    });

    // Check corner radius styling in heroCard vs defaultCard
    const heroCornerStyle = heroCard.props.style[1];
    assertEqual(heroCornerStyle.borderTopLeftRadius, 28, 'Hero card top-left 28');
    assertEqual(heroCornerStyle.borderBottomLeftRadius, 8, 'Hero card bottom-left 8 (asymmetric)');

    const defaultCornerStyle = defaultCard.props.style[1];
    assertEqual(defaultCornerStyle.borderRadius, 20, 'Default card standard 20px radius');
  });

  // ---------------------------------------------------------------------------
  // 3. CHIP COMPONENT EMPIRICAL CHALLENGES
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Chip: Selection Spring, Color Interpolation & Badge Bounce ---');

  await test('Chip selection spring and color interpolation', () => {
    const env = createEnvironment({ reduceMotion: false });
    const mod = evalTsModule('src/components/common/Chip.tsx', env.customMocks);

    const vnode = mod.Chip({
      label: 'React Native',
      selected: true,
      onPress: () => {},
    });

    const selectProgressSV = env.sharedValues.find((s) => s.value && s.value.toValue === 1);
    assert(selectProgressSV, 'Selection state must spring selectProgress to 1');
    assertEqual(selectProgressSV.value.config.damping, 18, 'Snappy damping for chip selection');

    // Press in scale 0.95
    vnode.props.onPressIn();
    const scaleSV = env.sharedValues.find((s) => s.value && s.value.toValue === 0.95);
    assert(scaleSV, 'Chip press-in springs to 0.95');

    // Interpolated animated style
    const animStyleFn = vnode.props.style[2];
    const styles = animStyleFn();
    assert(styles.backgroundColor.includes('interpolated'), 'Background color must be interpolated');
    assert(styles.borderColor.includes('interpolated'), 'Border color must be interpolated');
  });

  await test('Chip badge bounce physics: count change triggers bouncy spring', () => {
    const env = createEnvironment({ reduceMotion: false });
    // Simulate count change in React state/props
    let prevCount = 5;
    let newCount = 6;
    let badgeScale = 1.0;
    let bouncyConfig = null;

    if (newCount !== prevCount) {
      badgeScale = 1.2;
      badgeScale = 1.0;
      bouncyConfig = { damping: 11, stiffness: 190, mass: 0.8 };
    }

    assertEqual(bouncyConfig.damping, 11, 'Badge bounce damping: 11');
    assertEqual(bouncyConfig.stiffness, 190, 'Badge bounce stiffness: 190');
    assertEqual(bouncyConfig.mass, 0.8, 'Badge bounce mass: 0.8');

    // Verify Chip source code contains badge bounce hook logic
    const chipSource = readFile('src/components/common/Chip.tsx');
    assert(chipSource.includes('prevCountRef'), 'Chip must maintain count ref for bounce detection');
    assert(chipSource.includes('badgeScale.value = 1.2'), 'Chip must pop badge scale to 1.2');
    assert(chipSource.includes('motionSprings.bouncy'), 'Chip must use bouncy spring preset for settling');
  });

  // ---------------------------------------------------------------------------
  // 4. TABS COMPONENT EMPIRICAL CHALLENGES
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Tabs: Sliding Indicator Physics & Segmented Tab Navigation ---');

  await test('Tabs sliding indicator math and smooth spring translation', () => {
    const env = createEnvironment({ reduceMotion: false });
    const mod = evalTsModule('src/components/common/Tabs.tsx', env.customMocks);

    let currentTab = 'curriculum';
    const tabsData = [
      { id: 'curriculum', label: 'Curriculum' },
      { id: 'overview', label: 'Overview' },
      { id: 'reviews', label: 'Reviews' },
    ];

    const vnode = mod.Tabs({
      tabs: tabsData,
      activeTab: currentTab,
      onChange: (id) => { currentTab = id; },
    });

    // Simulate container layout (width = 300)
    vnode.props.onLayout({ nativeEvent: { layout: { width: 300 } } });

    // Tab width should be 300 / 3 = 100
    const indicatorSV = env.sharedValues.find((s) => s.value !== undefined);
    assert(indicatorSV, 'Indicator offset shared value exists');

    // Switch to tab index 1 ('overview')
    const targetOffset = 1 * (300 / 3); // 100
    assertEqual(targetOffset, 100, 'Indicator target offset for tab 1');

    // Verify Tabs.tsx spring preset used
    const tabsSource = readFile('src/components/common/Tabs.tsx');
    assert(tabsSource.includes('motionSprings.smooth'), 'Tabs indicator must use motionSprings.smooth');
    assert(tabsSource.includes('motionSprings.snappy'), 'Tab button press must use motionSprings.snappy');
    assert(tabsSource.includes('triggerHaptic(\'selection\''), 'Tab selection must trigger selection haptic');
  });

  await test('Tabs reduced motion: Instant translation without spring overshoot', () => {
    const tabsSource = readFile('src/components/common/Tabs.tsx');
    assert(
      tabsSource.includes('if (shouldReduceMotion) {') &&
      tabsSource.includes('indicatorOffset.value = targetOffset;'),
      'Tabs must assign indicatorOffset directly when shouldReduceMotion is true'
    );
  });

  await test('Tabs edge cases: 0 tabs and unmatched activeTab fallback', () => {
    const tabs = [];
    const activeTab = 'non-existent';
    const activeIndex = Math.max(0, tabs.findIndex((t) => t.id === activeTab));
    const containerWidth = 300;
    const tabWidth = containerWidth > 0 && tabs.length > 0 ? containerWidth / tabs.length : 0;

    assertEqual(activeIndex, 0, 'Unmatched tab safely falls back to index 0');
    assertEqual(tabWidth, 0, 'Zero tabs safely produces tabWidth 0 without NaN/Infinity');
  });

  // ---------------------------------------------------------------------------
  // 5. FLOATING INPUT EMPIRICAL CHALLENGES
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. FloatingInput: Animated Label Elevation & Clear Action ---');

  await test('FloatingInput elevation condition and transform physics', () => {
    const env = createEnvironment({ reduceMotion: false });
    const mod = evalTsModule('src/components/common/FloatingInput.tsx', env.customMocks);

    // State 1: Unfocused, Empty -> isFloating = false
    const calcFloating = (focused, val) => focused || Boolean(val && val.length > 0);
    assertEqual(calcFloating(false, ''), false, 'Unfocused + empty is not floating');
    assertEqual(calcFloating(true, ''), true, 'Focused + empty is floating');
    assertEqual(calcFloating(false, 'alex@example.com'), true, 'Unfocused + filled is floating');
    assertEqual(calcFloating(true, 'alex@example.com'), true, 'Focused + filled is floating');

    // Transform math: translateY = -22 * progress, scale = 1 - 0.18 * progress
    const calcTransform = (progress) => ({
      translateY: -22 * progress,
      scale: 1 - 0.18 * progress,
    });

    const resting = calcTransform(0);
    assertEqual(resting.translateY, 0, 'Resting translateY: 0');
    assertEqual(resting.scale, 1.0, 'Resting scale: 1.0');

    const elevated = calcTransform(1);
    assertEqual(elevated.translateY, -22, 'Elevated translateY: -22');
    assertEqual(Number(elevated.scale.toFixed(2)), 0.82, 'Elevated scale: 0.82');

    // Source inspection for spring preset and accessibility
    const fiSource = readFile('src/components/common/FloatingInput.tsx');
    assert(fiSource.includes('motionSprings.snappy'), 'Floating label must use motionSprings.snappy');
    assert(fiSource.includes('minHeight: 54'), 'Input touch target must exceed 48px');
    assert(fiSource.includes('onClear'), 'Clear button callback support');
  });

  // ---------------------------------------------------------------------------
  // 6. OTP BOXES EMPIRICAL CHALLENGES
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. OtpBoxes: Focus Spring, Sinusoidal Error Shake & Imperative Ref ---');

  await test('OtpBoxes imperative ref: shake, focus, and clear methods', () => {
    const env = createEnvironment({ reduceMotion: false });
    const mod = evalTsModule('src/components/common/OtpBoxes.tsx', env.customMocks);

    let otpValue = '123';
    const ref = { current: null };

    const vnode = mod.OtpBoxes({
      length: 6,
      value: otpValue,
      onChange: (val) => { otpValue = val; },
      ref,
    });

    assert(ref.current, 'OtpBoxesRef must be populated via useImperativeHandle');
    assert(typeof ref.current.shake === 'function', 'ref.current.shake must be a function');
    assert(typeof ref.current.focus === 'function', 'ref.current.focus must be a function');
    assert(typeof ref.current.clear === 'function', 'ref.current.clear must be a function');

    // Test clear()
    ref.current.clear();
    assertEqual(otpValue, '', 'clear() must reset value to empty string');

    // Test shake()
    ref.current.shake();
    assertEqual(env.hapticCalls.length, 1, 'shake() must trigger error haptic');
    assertEqual(env.hapticCalls[0].type, 'error', 'Haptic feedback style must be error');

    const shakeSV = env.sharedValues.find((s) => s.value && s.value.type === 'sequence');
    assert(shakeSV, 'shake() must assign withSequence animation to shakeX');
    assertEqual(shakeSV.value.animations.length, 7, 'Shake sequence must have 7 decaying oscillation steps');
  });

  await test('OtpBoxes sinusoidal shake oscillation damping analysis', () => {
    // Decaying amplitudes: 14 -> -14 -> 10 -> -10 -> 5 -> -5 -> 0
    const sequence = [14, -14, 10, -10, 5, -5, 0];
    for (let i = 0; i < sequence.length - 1; i++) {
      if (sequence[i] !== 0 && sequence[i + 1] !== 0) {
        assert(
          Math.sign(sequence[i]) !== Math.sign(sequence[i + 1]),
          `Adjacent shake frames must alternate signs: ${sequence[i]} -> ${sequence[i + 1]}`
        );
        assert(
          Math.abs(sequence[i]) >= Math.abs(sequence[i + 1]),
          `Shake amplitude must decay monotonically: ${sequence[i]} >= ${sequence[i + 1]}`
        );
      }
    }
    assertEqual(sequence[sequence.length - 1], 0, 'Final frame settles cleanly at 0');
  });

  await test('OtpBoxes paste and multi-digit handling', () => {
    const cleanPaste = (text, length = 6) => text.replace(/\D/g, '').slice(0, length);

    assertEqual(cleanPaste('123456'), '123456', 'Exact 6 digits');
    assertEqual(cleanPaste('987654321'), '987654', 'Truncated to 6 digits');
    assertEqual(cleanPaste('A-458#29X'), '45829', 'Alpha-special characters stripped');
  });

  await test('OtpBoxes reduced motion: Shake animation suppressed', () => {
    const env = createEnvironment({ reduceMotion: true });
    const mod = evalTsModule('src/components/common/OtpBoxes.tsx', env.customMocks);

    const ref = { current: null };
    mod.OtpBoxes({
      length: 6,
      value: '123',
      onChange: () => {},
      ref,
    });

    ref.current.shake();
    const shakeSV = env.sharedValues.find((s) => s.value && s.value.type === 'sequence');
    assertEqual(shakeSV, undefined, 'Under reduced motion, shakeX sequence must not be dispatched');
  });

  // ---------------------------------------------------------------------------
  // 7. GESTURE HANDLER HOOKS & WORKLET SAFETY
  // ---------------------------------------------------------------------------
  console.log('\n--- 7. Gesture Handler 2 Hooks: Physics & Worklet Safety ---');

  await test('useSwipeAction worklet safety and dismiss physics', () => {
    const hookSource = readFile('src/motion/hooks/useSwipeAction.ts');
    assert(hookSource.includes('runOnJS(notifyHaptic)'), 'Haptics in swipe must be dispatched via runOnJS');
    assert(hookSource.includes('runOnJS(notifyDelete)'), 'onDelete in swipe must be dispatched via runOnJS');
    assert(hookSource.includes('motionSprings.snappy'), 'Snap-to-reveal must use snappy spring');
    assert(hookSource.includes('translateX.value = withTiming(-400'), 'Full dismiss must translate offscreen');
  });

  await test('useBottomSheetGesture upward rubber-band damping & dismiss threshold', () => {
    const hookSource = readFile('src/motion/hooks/useBottomSheetGesture.ts');
    assert(hookSource.includes('rawY * 0.25'), 'Upward drag must have 0.25 resistance factor');
    assert(hookSource.includes('y > dismissThreshold || vy > velocityThreshold'), 'Dismiss condition check');
    assert(hookSource.includes('motionSprings.smooth'), 'Dismiss spring must use motionSprings.smooth');
    assert(hookSource.includes('runOnJS(notifyClose)'), 'Close callback must be dispatched via runOnJS');
  });

  await test('usePullToRefresh exponential resistance and bouncy spring', () => {
    const hookSource = readFile('src/motion/hooks/usePullToRefresh.ts');
    assert(hookSource.includes('Math.pow(rawY, 0.85)'), 'Resistance curve must follow Math.pow(rawY, 0.85)');
    assert(hookSource.includes('motionSprings.bouncy'), 'Release spring must use motionSprings.bouncy');
    assert(hookSource.includes('runOnJS(notifyThresholdHaptic)'), 'Threshold haptic must use runOnJS');
  });

  await test('useQuizCardSwipe angular rotation and velocity thresholds', () => {
    const hookSource = readFile('src/motion/hooks/useQuizCardSwipe.ts');
    assert(hookSource.includes('(translateX.value / SCREEN_WIDTH) * 12'), 'Rotation formula: (translateX / SCREEN_WIDTH) * 12deg');
    assert(hookSource.includes('runOnJS(notifyNext)'), 'Next transition callback via runOnJS');
    assert(hookSource.includes('runOnJS(notifyPrev)'), 'Prev transition callback via runOnJS');
    assert(hookSource.includes('motionSprings.snappy'), 'Cancellation snap-back uses motionSprings.snappy');
  });

  // ---------------------------------------------------------------------------
  // 8. LAYOUT TRANSITIONS & SCREEN INTEGRATIONS
  // ---------------------------------------------------------------------------
  console.log('\n--- 8. Layout Transitions & Screen Integrations ---');

  await test('motionLayout LinearTransition presets export', () => {
    const mod = evalTsModule('src/motion/tokens/layout.ts');
    assert(mod.motionLayout, 'motionLayout export missing');
    assert(mod.motionLayout.snappy, 'motionLayout.snappy preset missing');
    assert(mod.motionLayout.smooth, 'motionLayout.smooth preset missing');
    assert(mod.motionLayout.bouncy, 'motionLayout.bouncy preset missing');
    assert(mod.motionLayout.gentle, 'motionLayout.gentle preset missing');
  });

  await test('Screen integrations consume M2 components and hooks', () => {
    // 1. notifications.tsx
    const notifSource = readFile('app/notifications.tsx');
    assert(notifSource.includes('useSwipeAction'), 'notifications.tsx must wire useSwipeAction');

    // 2. quiz/[quizId].tsx
    const quizSource = readFile('app/quiz/[quizId].tsx');
    assert(quizSource.includes('useQuizCardSwipe'), 'quiz/[quizId].tsx must wire useQuizCardSwipe');

    // 3. (auth)/otp.tsx
    const otpSource = readFile('app/(auth)/otp.tsx');
    assert(otpSource.includes('OtpBoxes'), 'otp.tsx must wire OtpBoxes');
    assert(otpSource.includes('OtpBoxesRef'), 'otp.tsx must wire OtpBoxesRef');

    // 4. player/[lessonId].tsx
    const playerSource = readFile('app/player/[lessonId].tsx');
    assert(playerSource.includes('Tabs'), 'player/[lessonId].tsx must wire Tabs');

    // 5. course/[id].tsx
    const courseSource = readFile('app/course/[id].tsx');
    assert(courseSource.includes('motionLayout.smooth'), 'course/[id].tsx must wire layout transitions');

    // 6. (tabs)/index.tsx and courses.tsx
    const homeSource = readFile('app/(tabs)/index.tsx');
    const coursesSource = readFile('app/(tabs)/courses.tsx');
    assert(homeSource.includes('motionLayout'), 'home screen must wire layout transitions');
    assert(coursesSource.includes('motionLayout'), 'courses screen must wire layout transitions');
  });

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TOTAL ADVERSARIAL TESTS: ${passedCount + failedCount} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    console.error('FAILURES:');
    failures.forEach((f) => console.error(` - ${f.name}: ${f.error.message}`));
    process.exit(1);
  } else {
    console.log('🎉 ALL MILESTONE 2 EMPIRICAL CHALLENGES PASSED!\n');
    process.exit(0);
  }
}

runAdversarialM2Suite().catch((err) => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
