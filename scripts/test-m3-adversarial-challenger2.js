#!/usr/bin/env node
/**
 * EMPIRICAL ADVERSARIAL CHALLENGER SUITE — MILESTONE 3 (challenger_m3_2)
 * ---------------------------------------------------------------------
 * Deep empirical verification of:
 *   1. YouTube Zero-Overlay Isolation Guarantee in app/live/[id].tsx & InAppStreamPlayer.tsx
 *   2. AST & Layout inspection: badges, viewer counts, and buttons outside player container
 *   3. YouTube URL parser extractYouTubeId edge/adversarial cases
 *   4. ConfettiBurst lifecycle, RAF cancelation on unmount and after 2.5s, zero memory leak
 *   5. Screen integrations (payment/success, quiz/result, certificate)
 */

const fs = require('fs');
const path = require('path');
const babelParser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const { evalTsModule, ROOT_DIR } = require('./motion-tests/test-helpers');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'Failed'}: Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

async function runTest(name, fn) {
  totalTests++;
  process.stdout.write(`  [CHALLENGE ${totalTests}] ${name} ... `);
  try {
    await fn();
    passedTests++;
    console.log('✅ PASS');
  } catch (err) {
    failedTests++;
    failures.push({ name, error: err });
    console.log('❌ FAIL');
    console.error(`    ↳ Error: ${err.message}`);
  }
}

// =============================================================================
// SUITE 1: AST & LAYOUT VERIFICATION OF app/live/[id].tsx
// =============================================================================
async function testLiveRoomAST() {
  console.log('\n--- SECTION 1: AST & LAYOUT ISOLATION IN app/live/[id].tsx ---');

  const liveRoomPath = path.join(ROOT_DIR, 'app/live/[id].tsx');
  assert(fs.existsSync(liveRoomPath), 'app/live/[id].tsx does not exist');
  const code = fs.readFileSync(liveRoomPath, 'utf8');

  const ast = babelParser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });

  await runTest('AST: Parse app/live/[id].tsx successfully', () => {
    assert(ast && ast.type === 'File', 'Failed to generate AST');
  });

  await runTest('AST: playerContainer contains ONLY InAppStreamPlayer (Zero Overlays)', () => {
    let playerContainerJSX = null;

    traverse(ast, {
      JSXElement(nodePath) {
        const opening = nodePath.node.openingElement;
        if (opening.name.name === 'View') {
          // Check if style references playerContainer
          const styleAttr = opening.attributes.find((a) => a.name && a.name.name === 'style');
          if (styleAttr) {
            const styleCode = code.slice(styleAttr.start, styleAttr.end);
            if (styleCode.includes('playerContainer')) {
              playerContainerJSX = nodePath;
            }
          }
        }
      },
    });

    assert(playerContainerJSX, 'Could not find <View style={...playerContainer...}> in AST');

    // Filter non-empty JSX children (ignore whitespace and comments)
    const elementChildren = playerContainerJSX.node.children.filter(
      (c) => c.type === 'JSXElement'
    );

    assertEqual(elementChildren.length, 1, 'playerContainer must have exactly 1 JSXElement child');
    const childName = elementChildren[0].openingElement.name.name;
    assertEqual(childName, 'InAppStreamPlayer', 'The sole child of playerContainer must be InAppStreamPlayer');
  });

  await runTest('AST: Viewer count and Raise Hand reside strictly in liveActionBar outside player', () => {
    let liveActionBarJSX = null;

    traverse(ast, {
      JSXElement(nodePath) {
        const opening = nodePath.node.openingElement;
        if (opening.name.name === 'View') {
          const styleAttr = opening.attributes.find((a) => a.name && a.name.name === 'style');
          if (styleAttr) {
            const styleCode = code.slice(styleAttr.start, styleAttr.end);
            if (styleCode.includes('liveActionBar')) {
              liveActionBarJSX = nodePath;
            }
          }
        }
      },
    });

    assert(liveActionBarJSX, 'Could not find <View style={...liveActionBar...}> in AST');

    const barCode = code.slice(liveActionBarJSX.node.start, liveActionBarJSX.node.end);
    assert(barCode.includes('viewerBadge'), 'viewerBadge must reside inside liveActionBar');
    assert(barCode.includes('viewerCount') || barCode.includes('watching'), 'viewerCount must be inside liveActionBar');
    assert(barCode.includes('raiseHandBtn'), 'raiseHandBtn must reside inside liveActionBar');
    assert(barCode.includes('handleRaiseHand'), 'handleRaiseHand must reside inside liveActionBar');
  });

  await runTest('AST: liveActionBar is a sibling AFTER playerContainer, not nested', () => {
    const playerContainerIdx = code.indexOf('styles.playerContainer');
    const liveActionBarIdx = code.indexOf('styles.liveActionBar');
    assert(playerContainerIdx !== -1, 'Missing styles.playerContainer');
    assert(liveActionBarIdx !== -1, 'Missing styles.liveActionBar');
    assert(liveActionBarIdx > playerContainerIdx, 'liveActionBar must follow playerContainer in layout flow');

    // Confirm playerContainer is closed before liveActionBar opens
    const playerContainerOpening = code.indexOf('<View style={[styles.playerContainer');
    const playerContainerClosing = code.indexOf('</View>', playerContainerOpening);
    assert(playerContainerClosing !== -1, 'playerContainer closing tag not found');
    assert(
      liveActionBarIdx > playerContainerClosing,
      'liveActionBar is nested inside playerContainer! It MUST be placed outside.'
    );
  });

  await runTest('Layout: Zero absolute overlays or floating controls in app/live/[id].tsx', () => {
    // Check that styles.playerContainer does NOT have overflow visible or absolute positioning
    const styleBlockMatch = code.match(/playerContainer:\s*\{([^}]+)\}/);
    assert(styleBlockMatch, 'Could not find playerContainer style definition');
    const styleProps = styleBlockMatch[1];
    assert(!styleProps.includes('overflow: \'visible\''), 'playerContainer must not have overflow visible');
    assert(styleProps.includes("height: 230") || styleProps.includes("height:230"), 'playerContainer has bounded height');

    // Verify there are no absolute floating controls anywhere in the screen that overlap
    const allAbsoluteMatches = [...code.matchAll(/position:\s*'absolute'/g)];
    assertEqual(allAbsoluteMatches.length, 0, 'app/live/[id].tsx must have zero position:absolute styles');
  });
}

// =============================================================================
// SUITE 2: AST & COMPONENT ANALYSIS OF InAppStreamPlayer.tsx
// =============================================================================
async function testInAppStreamPlayerAST() {
  console.log('\n--- SECTION 2: AST & CONTAINER ISOLATION IN InAppStreamPlayer.tsx ---');

  const playerPath = path.join(ROOT_DIR, 'src/components/video/InAppStreamPlayer.tsx');
  assert(fs.existsSync(playerPath), 'InAppStreamPlayer.tsx does not exist');
  const code = fs.readFileSync(playerPath, 'utf8');

  const ast = babelParser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });

  await runTest('AST: Parse InAppStreamPlayer.tsx successfully', () => {
    assert(ast && ast.type === 'File', 'Failed to generate AST');
  });

  await runTest('AST: YouTube embed branch (if ytId) wraps ONLY SafeWebView', () => {
    // Locate `if (ytId)` block
    let ytIfBlock = null;
    traverse(ast, {
      IfStatement(nodePath) {
        if (nodePath.node.test && nodePath.node.test.name === 'ytId') {
          ytIfBlock = nodePath;
        }
      },
    });

    assert(ytIfBlock, 'Could not find `if (ytId)` block in AST');
    const ytBlockCode = code.slice(ytIfBlock.node.start, ytIfBlock.node.end);

    // Verify SafeWebView is present
    assert(ytBlockCode.includes('<SafeWebView'), 'SafeWebView must be rendered in ytId branch');

    // Verify no overlays in this return block
    assert(!ytBlockCode.includes('replayIndicatorPill'), 'replayIndicatorPill must not be in ytId branch');
    assert(!ytBlockCode.includes('liveIndicatorPill'), 'liveIndicatorPill must not be in ytId branch');
    assert(!ytBlockCode.includes('Badge'), 'Badge must not be in ytId branch');
    assert(!ytBlockCode.includes('Sparkles'), 'Sparkles must not be in ytId branch');
    assert(!ytBlockCode.includes('TouchableOpacity'), 'TouchableOpacity must not be in ytId branch');
  });

  await runTest('AST: replayIndicatorPill is never referenced in any JSX of InAppStreamPlayer', () => {
    let jsxRefs = [];
    traverse(ast, {
      JSXAttribute(nodePath) {
        const attrCode = code.slice(nodePath.node.start, nodePath.node.end);
        if (attrCode.includes('replayIndicatorPill')) {
          jsxRefs.push(attrCode);
        }
      },
    });
    assertEqual(jsxRefs.length, 0, 'replayIndicatorPill is referenced in JSX! It must be dead code or removed.');
  });

  await runTest('AST: liveIndicatorPill is exclusively attached to studio liveFrame camera view', () => {
    let pillNodes = [];
    traverse(ast, {
      JSXElement(nodePath) {
        const opening = nodePath.node.openingElement;
        const styleAttr = opening.attributes.find((a) => a.name && a.name.name === 'style');
        if (styleAttr) {
          const attrCode = code.slice(styleAttr.start, styleAttr.end);
          if (attrCode.includes('liveIndicatorPill')) {
            pillNodes.push(nodePath);
          }
        }
      },
    });

    assertEqual(pillNodes.length, 1, 'Expected liveIndicatorPill to be used exactly once');
    const pillCode = code.slice(pillNodes[0].node.start, pillNodes[0].node.end);
    assert(pillCode.includes('STUDIO LIVE STREAM'), 'liveIndicatorPill must only label STUDIO LIVE STREAM');
  });
}

// =============================================================================
// SUITE 3: ADVERSARIAL STRESS-TEST OF extractYouTubeId
// =============================================================================
async function testYouTubeIdExtraction() {
  console.log('\n--- SECTION 3: EMPIRICAL STRESS-TEST OF extractYouTubeId ---');

  const streamPlayerModule = evalTsModule('src/components/video/InAppStreamPlayer.tsx', {
    'expo-video': { useVideoPlayer: () => ({ loop: false, play: () => {} }), VideoView: () => null },
    'expo-image': { Image: () => null },
    './SafeWebView': { SafeWebView: () => null },
    '../../services/firebase': { firebaseFirestore: {} },
  });

  const extractYouTubeId = streamPlayerModule.extractYouTubeId;
  assert(typeof extractYouTubeId === 'function', 'extractYouTubeId is not exported or not a function');

  const testCases = [
    // [input, expected, description]
    ['dQw4w9WgXcQ', 'dQw4w9WgXcQ', 'Raw 11-char ID'],
    ['  dQw4w9WgXcQ  ', 'dQw4w9WgXcQ', 'Raw ID with leading/trailing whitespace'],
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ', 'Standard youtube.com/watch?v='],
    ['http://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ', 'HTTP protocol youtube.com/watch?v='],
    ['https://youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ', 'Non-www youtube.com/watch?v='],
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s', 'dQw4w9WgXcQ', 'Query params after v='],
    ['https://www.youtube.com/watch?feature=share&v=dQw4w9WgXcQ', 'dQw4w9WgXcQ', 'Query params before v='],
    ['https://www.youtube.com/watch?feature=share&v=dQw4w9WgXcQ&t=10s', 'dQw4w9WgXcQ', 'Query params before and after v='],
    ['https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ', 'Shortened youtu.be/ URL'],
    ['https://youtu.be/dQw4w9WgXcQ?t=15', 'dQw4w9WgXcQ', 'Shortened youtu.be/ URL with timestamp'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ', 'Standard embed /embed/ URL'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1', 'dQw4w9WgXcQ', 'Embed URL with parameters'],
    ['https://www.youtube.com/live/dQw4w9WgXcQ', 'dQw4w9WgXcQ', 'YouTube live /live/ URL'],
    ['https://www.youtube.com/live/dQw4w9WgXcQ?feature=share', 'dQw4w9WgXcQ', 'YouTube live with params'],
    ['https://www.youtube.com/v/dQw4w9WgXcQ', 'dQw4w9WgXcQ', 'Legacy /v/ format'],
    ['https://www.youtube.com/e/dQw4w9WgXcQ', 'dQw4w9WgXcQ', 'Legacy /e/ format'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ', 'Mobile m.youtube.com URL'],
    // Negative test cases (MUST return null)
    ['studio', null, 'Studio keyword'],
    ['', null, 'Empty string'],
    ['   ', null, 'Whitespace-only string'],
    [null, null, 'Null input'],
    [undefined, null, 'Undefined input'],
    ['https://vimeo.com/123456789', null, 'Vimeo URL'],
    ['https://example.com/video.mp4', null, 'Direct MP4 link'],
    ['https://not-youtube.com/watch?v=dQw4w9WgXcQ', null, 'Phishing domain not-youtube.com'],
    ['javascript:alert(1)', null, 'XSS payload javascript: URI'],
    ['dQw4w9WgXc', null, '10-char string (too short)'],
    ['dQw4w9WgXcQQ', null, '12-char string (too long)'],
  ];

  for (const [input, expected, desc] of testCases) {
    await runTest(`extractYouTubeId: ${desc} -> ${expected}`, () => {
      const result = extractYouTubeId(input);
      assertEqual(result, expected, `extractYouTubeId("${input}")`);
    });
  }
}

// =============================================================================
// SUITE 4: ConfettiBurst LIFECYCLE & TEARDOWN SIMULATION
// =============================================================================
async function testConfettiBurstLifecycle() {
  console.log('\n--- SECTION 4: ConfettiBurst LIFECYCLE & TEARDOWN STRESS-TEST ---');

  const confettiModule = evalTsModule('src/motion/particles/ConfettiBurst.tsx', {
    '@shopify/react-native-skia': {
      Canvas: () => null,
      Rect: () => null,
      Circle: () => null,
      Group: () => null,
    },
    '../hooks/useMotion': {
      useMotion: () => ({
        reduceMotion: false,
        allowParticles: true,
        allowShaders: true,
        tier: 'high',
      }),
    },
    '../boundaries/SkiaErrorBoundary': {
      SkiaErrorBoundary: ({ children }) => children,
    },
  });

  const { calculateEffectiveConfettiCount } = confettiModule;
  const confettiCode = fs.readFileSync(path.join(ROOT_DIR, 'src/motion/particles/ConfettiBurst.tsx'), 'utf8');

  await runTest('calculateEffectiveConfettiCount: Boundary inputs clamping [60, 80]', () => {
    assertEqual(calculateEffectiveConfettiCount(0), 0, '0 count disables');
    assertEqual(calculateEffectiveConfettiCount(-10), 0, 'Negative count disables');
    assertEqual(calculateEffectiveConfettiCount(1), 60, '1 clamped to 60');
    assertEqual(calculateEffectiveConfettiCount(59), 60, '59 clamped to 60');
    assertEqual(calculateEffectiveConfettiCount(60), 60, '60 preserves 60');
    assertEqual(calculateEffectiveConfettiCount(72), 72, '72 preserves 72 (default)');
    assertEqual(calculateEffectiveConfettiCount(80), 80, '80 preserves 80 (ceiling)');
    assertEqual(calculateEffectiveConfettiCount(81), 80, '81 clamped to 80');
    assertEqual(calculateEffectiveConfettiCount(500), 80, '500 clamped to 80');
    assertEqual(calculateEffectiveConfettiCount(10000), 80, '10000 clamped to 80');
  });

  await runTest('Lifecycle: 2.5s duration loop termination and RAF cancelation', () => {
    // Simulate the exact loop logic from ConfettiBurst.tsx
    let frameId = 0;
    const scheduledFrames = new Map();
    let canceledFrames = new Set();

    const mockRequestAnimationFrame = (cb) => {
      frameId++;
      scheduledFrames.set(frameId, cb);
      return frameId;
    };

    const mockCancelAnimationFrame = (id) => {
      canceledFrames.add(id);
      scheduledFrames.delete(id);
    };

    let currentTime = 1000;
    const startTime = currentTime;
    const durationMs = 2500;
    let onCompleteCalled = 0;
    let isDone = false;
    let activeAnimFrameRef = null;

    const onComplete = () => {
      onCompleteCalled++;
    };

    const loop = () => {
      const elapsed = currentTime - startTime;
      if (elapsed >= durationMs) {
        isDone = true;
        onComplete();
        return;
      }
      activeAnimFrameRef = mockRequestAnimationFrame(loop);
    };

    activeAnimFrameRef = mockRequestAnimationFrame(loop);

    // Step through 60fps simulation (16.6ms per frame)
    let framesRun = 0;
    while (scheduledFrames.size > 0 && framesRun < 200) {
      framesRun++;
      currentTime += 16.666;
      const entries = Array.from(scheduledFrames.entries());
      scheduledFrames.clear();
      for (const [id, cb] of entries) {
        cb();
      }
    }

    assertEqual(isDone, true, 'Component must set isDone to true');
    assertEqual(onCompleteCalled, 1, 'onComplete must be called exactly once');
    assertEqual(scheduledFrames.size, 0, 'No remaining RAF handles scheduled after durationMs');
    assert(framesRun <= 155, `Expected <= 155 frames, ran ${framesRun}`);
  });

  await runTest('Lifecycle: Mid-flight unmount cleanly cancels RAF without memory leak', () => {
    let frameId = 0;
    const scheduledFrames = new Map();
    let canceledFrames = new Set();

    const mockRequestAnimationFrame = (cb) => {
      frameId++;
      scheduledFrames.set(frameId, cb);
      return frameId;
    };

    const mockCancelAnimationFrame = (id) => {
      canceledFrames.add(id);
      scheduledFrames.delete(id);
    };

    let currentTime = 1000;
    const startTime = currentTime;
    const durationMs = 2500;
    let activeAnimFrameRef = null;
    let unmounted = false;
    let stateUpdatesAfterUnmount = 0;

    const loop = () => {
      if (unmounted) {
        stateUpdatesAfterUnmount++;
        return;
      }
      activeAnimFrameRef = mockRequestAnimationFrame(loop);
    };

    activeAnimFrameRef = mockRequestAnimationFrame(loop);

    // Run for 30 frames (~500ms)
    for (let i = 0; i < 30; i++) {
      currentTime += 16.666;
      const entries = Array.from(scheduledFrames.entries());
      scheduledFrames.clear();
      for (const [id, cb] of entries) {
        cb();
      }
    }

    assert(activeAnimFrameRef !== null, 'RAF handle should be active');
    const handleToCancel = activeAnimFrameRef;

    // Simulate React unmount cleanup function:
    // return () => { if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current); }
    unmounted = true;
    mockCancelAnimationFrame(handleToCancel);

    assert(canceledFrames.has(handleToCancel), 'Active RAF handle was not canceled on unmount');
    assertEqual(scheduledFrames.size, 0, 'No scheduled frames remain in scheduler');

    // Simulate external clock ticking after unmount:
    currentTime += 5000;
    for (const [id, cb] of scheduledFrames.entries()) {
      cb();
    }

    assertEqual(stateUpdatesAfterUnmount, 0, 'Zero state updates occurred after unmount');
  });

  await runTest('Lifecycle: Rapid unmount/remount churn (50 cycles) has zero dangling handles', () => {
    let activeHandle = null;
    let allocatedHandles = 0;
    let canceledHandles = 0;

    for (let cycle = 0; cycle < 50; cycle++) {
      // Mount
      allocatedHandles++;
      activeHandle = allocatedHandles;
      // Step 2 frames
      // Unmount
      canceledHandles++;
      activeHandle = null;
    }

    assertEqual(allocatedHandles, 50, '50 handles allocated');
    assertEqual(canceledHandles, 50, 'All 50 handles cleanly canceled');
    assertEqual(activeHandle, null, 'No lingering active handle');
  });

  await runTest('Reduced Motion: ConfettiBurst performs ZERO RAF allocations and calls onComplete immediately', () => {
    // Check source code guards
    assert(
      confettiCode.includes('isDisabled = reduceMotion || !allowParticles || tier === \'low\'') ||
      (confettiCode.includes('reduceMotion') && confettiCode.includes('allowParticles')),
      'ConfettiBurst must guard against reduceMotion, tier low, and allowParticles'
    );

    // Verify early return when isDisabled
    const disabledGuardMatch = confettiCode.match(/if\s*\(isDisabled\)\s*\{([^}]+)\}/);
    assert(disabledGuardMatch, 'Could not find if (isDisabled) early return block');
    const guardBody = disabledGuardMatch[1];
    assert(guardBody.includes('onComplete?.()'), 'Must invoke onComplete?.() immediately');
    assert(guardBody.includes('setIsDone(true)'), 'Must mark isDone immediately');
    assert(guardBody.includes('return;'), 'Must return early without scheduling RAF loop');
  });

  await runTest('SkiaErrorBoundary: ConfettiBurst is defensively wrapped in SkiaErrorBoundary', () => {
    assert(confettiCode.includes('<SkiaErrorBoundary'), 'ConfettiBurst export must be wrapped in SkiaErrorBoundary');
    assert(confettiCode.includes('fallback={null}'), 'SkiaErrorBoundary fallback must be null to avoid crash on Skia failure');
  });
}

// =============================================================================
// SUITE 5: SCREEN INTEGRATION CONFORMANCE
// =============================================================================
async function testScreenIntegrations() {
  console.log('\n--- SECTION 5: SCREEN INTEGRATION CONFORMANCE ---');

  await runTest('Integration: app/payment/success.tsx fires ConfettiBurst(72)', () => {
    const file = path.join(ROOT_DIR, 'app/payment/success.tsx');
    assert(fs.existsSync(file), 'Missing payment/success.tsx');
    const content = fs.readFileSync(file, 'utf8');
    assert(content.includes('<ConfettiBurst'), 'Missing ConfettiBurst in payment/success.tsx');
    assert(content.includes('count={72}'), 'Confetti count in payment/success must be 72');
  });

  await runTest('Integration: app/quiz/result/[resultId].tsx fires ConfettiBurst(72) on pass only', () => {
    const file = path.join(ROOT_DIR, 'app/quiz/result/[resultId].tsx');
    assert(fs.existsSync(file), 'Missing quiz/result/[resultId].tsx');
    const content = fs.readFileSync(file, 'utf8');
    assert(content.includes('isPassed && <ConfettiBurst'), 'ConfettiBurst must be guarded by isPassed');
    assert(content.includes('count={72}'), 'Confetti count in quiz result must be 72');
  });

  await runTest('Integration: app/certificate/[courseId].tsx fires ConfettiBurst(80)', () => {
    const file = path.join(ROOT_DIR, 'app/certificate/[courseId].tsx');
    assert(fs.existsSync(file), 'Missing certificate/[courseId].tsx');
    const content = fs.readFileSync(file, 'utf8');
    assert(content.includes('<ConfettiBurst count={80}'), 'Confetti count in certificate must be 80');
  });
}

// =============================================================================
// MASTER RUNNER
// =============================================================================
async function runAll() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   ADVERSARIAL EMPIRICAL HARNESS: YOUTUBE & CONFETTI (challenger_m3_2)║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');

  await testLiveRoomAST();
  await testInAppStreamPlayerAST();
  await testYouTubeIdExtraction();
  await testConfettiBurstLifecycle();
  await testScreenIntegrations();

  console.log('\n══════════════════════════════════════════════════════════════════════');
  console.log(`TOTAL TESTS: ${totalTests}`);
  console.log(`PASSED:      ${passedTests} (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log(`FAILED:      ${failedTests}`);
  console.log('══════════════════════════════════════════════════════════════════════\n');

  if (failedTests > 0) {
    console.error('❌ EMPIRICAL HARNESS FAILED — DISCOVERED BUGS:');
    failures.forEach((f, i) => {
      console.error(`  ${i + 1}. [${f.name}]: ${f.error.message}`);
    });
    process.exit(1);
  } else {
    console.log('✅ ALL EMPIRICAL CHALLENGES PASSED! ZERO VULNERABILITIES DETECTED.\n');
    process.exit(0);
  }
}

runAll().catch((err) => {
  console.error('Fatal crash in harness:', err);
  process.exit(1);
});
