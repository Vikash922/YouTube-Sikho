/**
 * E2E MOTION TEST SUITE — SHARED TEST HARNESS & UTILITIES
 * -------------------------------------------------------------
 * Provides:
 *  - Test registration, tracking, and metric aggregation
 *  - Deterministic assertions and error diagnostics
 *  - Dynamic TypeScript compilation and in-memory module evaluation
 *  - AST and semantic JSX structural inspection
 *  - Spring physics numerical simulation & math verification
 *  - Behavioral state machine & context mocking
 *  - YouTube zero-overlay isolation validator
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT_DIR = path.resolve(__dirname, '../..');

// -----------------------------------------------------------------------------
// 1. Test Collector & Aggregator
// -----------------------------------------------------------------------------
class TestCollector {
  constructor(suiteName) {
    this.suiteName = suiteName;
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.pending = 0;
  }

  record({ id, name, tier, milestone, status, error = null, details = null }) {
    const item = { id, name, tier, milestone, status, error, details };
    this.tests.push(item);
    if (status === 'PASSED') this.passed++;
    else if (status === 'FAILED') this.failed++;
    else if (status === 'PENDING') this.pending++;
    return item;
  }

  summary() {
    return {
      suite: this.suiteName,
      total: this.tests.length,
      passed: this.passed,
      failed: this.failed,
      pending: this.pending,
      rate: this.tests.length > 0 ? Math.round((this.passed / this.tests.length) * 100) : 0,
    };
  }
}

// -----------------------------------------------------------------------------
// 2. Deterministic Assertions
// -----------------------------------------------------------------------------
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      `${message ? message + ' — ' : ''}Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

function assertDeepEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(
      `${message ? message + ' — ' : ''}Expected deep equality:\n  Expected: ${expectedStr}\n  Actual:   ${actualStr}`
    );
  }
}

function assertRange(actual, min, max, message) {
  if (actual < min || actual > max) {
    throw new Error(
      `${message ? message + ' — ' : ''}Value ${actual} outside range [${min}, ${max}]`
    );
  }
}

function assertMatch(actual, regex, message) {
  if (!regex.test(actual)) {
    throw new Error(
      `${message ? message + ' — ' : ''}Value did not match pattern ${regex}:\n${actual}`
    );
  }
}

function assertIncludes(actual, substring, message) {
  if (typeof actual === 'string' && !actual.includes(substring)) {
    throw new Error(
      `${message ? message + ' — ' : ''}String did not contain substring "${substring}"`
    );
  } else if (Array.isArray(actual) && !actual.includes(substring)) {
    throw new Error(
      `${message ? message + ' — ' : ''}Array did not contain element "${substring}"`
    );
  }
}

// -----------------------------------------------------------------------------
// 3. File & TypeScript Module Evaluation
// -----------------------------------------------------------------------------
function fileExists(relPath) {
  return fs.existsSync(path.join(ROOT_DIR, relPath));
}

function readFile(relPath) {
  const fullPath = path.join(ROOT_DIR, relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File does not exist: ${relPath}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function transpileTs(code) {
  const res = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  });
  return res.outputText;
}

function evalTsModule(relPath, customMocks = {}) {
  const code = readFile(relPath);
  const transpiled = transpileTs(code);

  const mockEasing = {
    bezier: (x1, y1, x2, y2) => ({ type: 'bezier', x1, y1, x2, y2 }),
    out: (fn) => fn,
    inOut: (fn) => fn,
    ease: () => {},
    linear: () => {},
  };

  const mockTransition = {
    springify: () => mockTransition,
    damping: () => mockTransition,
    stiffness: () => mockTransition,
    mass: () => mockTransition,
    duration: () => mockTransition,
  };

  const defaultMocks = {
    'react': {
      createContext: (def) => ({ Provider: ({ value, children }) => children, _def: def }),
      useState: (init) => [init, () => {}],
      useEffect: () => {},
      useMemo: (fn) => fn(),
      useCallback: (fn) => fn,
      useRef: (init) => ({ current: init }),
      Component: class MockComponent {
        constructor(props) { this.props = props; this.state = {}; }
        setState(s) { Object.assign(this.state, s); }
      },
    },
    'react-native': {
      Platform: { OS: 'ios', select: (obj) => obj.ios || obj.default },
      StyleSheet: { create: (s) => s, absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } },
      AccessibilityInfo: {
        isReduceMotionEnabled: async () => false,
        addEventListener: () => ({ remove: () => {} }),
      },
      View: () => null,
      Text: () => null,
      Dimensions: { get: () => ({ width: 390, height: 844 }) },
    },
    'react-native-reanimated': {
      Easing: mockEasing,
      LinearTransition: mockTransition,
      useSharedValue: (init) => ({ value: init }),
      useAnimatedStyle: (fn) => fn(),
      withSpring: (val) => val,
      withTiming: (val) => val,
      withSequence: (...vals) => vals,
      withRepeat: (val) => val,
      runOnJS: (fn) => fn,
      useReducedMotion: () => false,
      FadeIn: { duration: () => ({}) },
      FadeOut: { duration: () => ({}) },
      SlideInUp: { springify: () => ({}) },
      SlideOutUp: { duration: () => ({}) },
      default: {
        View: () => null,
        Text: () => null,
      },
    },
    'expo-haptics': {
      ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
      NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
      impactAsync: async () => {},
      notificationAsync: async () => {},
      selectionAsync: async () => {},
    },
    'lucide-react-native': new Proxy({}, { get: () => () => null }),
    'expo-linear-gradient': { LinearGradient: () => null },
    'zustand': {
      create: (fn) => {
        const state = fn ? fn(() => {}, () => ({})) : {};
        const hook = (sel) => (sel ? sel(state) : state);
        hook.getState = () => state;
        hook.setState = () => {};
        hook.subscribe = () => () => {};
        return hook;
      },
    },
    'firebase/app': {
      getApps: () => [],
      initializeApp: () => ({}),
      getApp: () => ({}),
    },
    'firebase/auth': {
      getAuth: () => ({}),
      onAuthStateChanged: () => () => {},
    },
    'firebase/firestore': new Proxy({}, { get: () => () => ({}) }),
    '../../theme': {
      useTheme: () => ({
        colors: {
          surfaceElevated: '#1E293B',
          surface: '#0F172A',
          border: '#334155',
          primary: '#4F46E5',
          background: '#0B1020',
          text: '#F8FAFC',
          textMuted: '#94A3B8',
          accent: '#F59E0B',
          error: '#EF4444',
          card: '#1E293B',
        },
        radius: { card: 12, full: 9999, sm: 4, md: 8, lg: 16 },
        typography: { caption: { fontSize: 12 }, body: { fontSize: 14 } },
        shadows: { sm: {}, md: {} },
        isDark: true,
      }),
    },
  };

  const moduleMocks = { ...defaultMocks, ...customMocks };

  const mockRequire = (modName) => {
    if (moduleMocks[modName]) {
      return moduleMocks[modName];
    }
    // Relative module resolutions
    if (modName.startsWith('.')) {
      const dir = path.dirname(path.join(ROOT_DIR, relPath));
      let resolved = path.resolve(dir, modName);
      if (fs.existsSync(resolved + '.ts')) resolved += '.ts';
      else if (fs.existsSync(resolved + '.tsx')) resolved += '.tsx';
      else if (fs.existsSync(path.join(resolved, 'index.ts'))) resolved = path.join(resolved, 'index.ts');
      
      const relResolved = path.relative(ROOT_DIR, resolved);
      if (fs.existsSync(resolved)) {
        return evalTsModule(relResolved, customMocks);
      }
    }
    return {};
  };

  const module = { exports: {} };
  const exports = module.exports;

  const fn = new Function('require', 'module', 'exports', '__dirname', '__filename', transpiled);
  fn(mockRequire, module, exports, path.dirname(path.join(ROOT_DIR, relPath)), path.join(ROOT_DIR, relPath));
  return module.exports;
}

// -----------------------------------------------------------------------------
// 4. Spring Physics & Numerical Mathematical Simulator
// -----------------------------------------------------------------------------
function simulateSpringPhysics(damping, stiffness, mass, initialDisplacement = 1.0, durationMs = 1000) {
  const dt = 0.001; // 1 millisecond step
  const steps = Math.floor(durationMs / (dt * 1000));
  let x = initialDisplacement;
  let v = 0;

  const omega0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));

  let maxOvershoot = 0;
  let settlingTimeMs = durationMs;
  let settled = false;

  for (let step = 0; step < steps; step++) {
    const tMs = step * (dt * 1000);
    const a = (-damping * v - stiffness * x) / mass;
    v += a * dt;
    x += v * dt;

    if (initialDisplacement > 0 && x < 0) {
      const overshoot = Math.abs(x) / initialDisplacement;
      if (overshoot > maxOvershoot) maxOvershoot = overshoot;
    }

    if (Math.abs(x) <= 0.02 * Math.abs(initialDisplacement)) {
      if (!settled) {
        settlingTimeMs = tMs;
        settled = true;
      }
    } else {
      settled = false;
    }
  }

  return {
    dampingRatio: Number(zeta.toFixed(4)),
    naturalFrequency: Number(omega0.toFixed(4)),
    isUnderdamped: zeta < 1.0,
    isOverdamped: zeta >= 1.0,
    maxOvershoot: Number(maxOvershoot.toFixed(4)),
    settlingTimeMs: Math.round(settlingTimeMs),
  };
}

// -----------------------------------------------------------------------------
// 5. Confetti Particle Cap Calculator
// -----------------------------------------------------------------------------
function calculateEffectiveConfettiCount(requestedCount = 72) {
  if (requestedCount <= 0) return 0;
  const MIN_CAP = 60;
  const MAX_CAP = 80;
  if (requestedCount < MIN_CAP) return MIN_CAP;
  if (requestedCount > MAX_CAP) return MAX_CAP;
  return requestedCount;
}

// -----------------------------------------------------------------------------
// 6. Gesture Dismiss Threshold Calculator
// -----------------------------------------------------------------------------
function evaluateDismissGesture(velocity, translation, velocityThreshold = 500, distanceThreshold = 150) {
  const velocityTriggered = velocity >= velocityThreshold;
  const distanceTriggered = translation >= distanceThreshold;
  return {
    shouldDismiss: velocityTriggered || distanceTriggered,
    velocityTriggered,
    distanceTriggered,
    rubberBandedOffset: translation < 0 ? translation * 0.25 : translation, // 4:1 resistance
  };
}

// -----------------------------------------------------------------------------
// 7. OTP Error Shake Simulator
// -----------------------------------------------------------------------------
function simulateOtpErrorShake(amplitude = 10, cycles = 4) {
  const frames = [];
  const totalSteps = cycles * 2;
  for (let i = 0; i <= totalSteps; i++) {
    const decay = 1 - i / totalSteps;
    const sign = i % 2 === 0 ? 1 : -1;
    frames.push(Math.round(amplitude * decay * sign));
  }
  return frames;
}

// -----------------------------------------------------------------------------
// 8. YouTube Zero-Overlay Isolation Checker
// -----------------------------------------------------------------------------
function verifyYouTubeZeroOverlays(filePath) {
  const content = readFile(filePath);
  const violations = [];

  const hasYouTubePlayer =
    content.includes('SafeWebView') ||
    content.includes('youtube.com/embed') ||
    content.includes('InAppStreamPlayer');

  if (!hasYouTubePlayer) {
    violations.push('No YouTube player or SafeWebView found in screen');
    return { compliant: false, violations };
  }

  if (filePath.includes('InAppStreamPlayer.tsx')) {
    const webViewIdx = content.indexOf('<SafeWebView');
    if (webViewIdx !== -1) {
      const nextContainerEnd = content.indexOf('</View>', webViewIdx);
      const subBlock = content.slice(webViewIdx, nextContainerEnd);
      if (subBlock.includes('replayIndicatorPill') || subBlock.includes('Badge') || subBlock.includes('Sparkles')) {
        violations.push(
          'Found overlay element (replayIndicatorPill / badge) inside the SafeWebView container. Overlays on YouTube player violate YouTube API terms.'
        );
      }
    }
  }

  return {
    compliant: violations.length === 0,
    violations,
  };
}

module.exports = {
  ROOT_DIR,
  TestCollector,
  assert,
  assertEqual,
  assertDeepEqual,
  assertRange,
  assertMatch,
  assertIncludes,
  fileExists,
  readFile,
  transpileTs,
  evalTsModule,
  simulateSpringPhysics,
  calculateEffectiveConfettiCount,
  evaluateDismissGesture,
  simulateOtpErrorShake,
  verifyYouTubeZeroOverlays,
};
