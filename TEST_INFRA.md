# E2E Motion & Interaction Test Infrastructure

## 1. Executive Summary

This document establishes the architecture, methodology, and operational guide for the automated, requirement-driven, opaque-box End-to-End (E2E) Motion and Interaction Test Suite for the Expo SDK 58 (React Native 0.88) course application.

The test infrastructure validates all 22 features, physics parameters, token contracts, reduced-motion accessibility constraints, performance tiering heuristics, and 12 signature orchestrated moments specified in `PROJECT.md` and `ORIGINAL_REQUEST.md`.

---

## 2. Test Architecture & Layout

The testing infrastructure is organized modularly under `scripts/motion-tests/` with a unified executable master runner at `scripts/e2e-motion-test-runner.js`:

```
/root/course-app/
├── scripts/
│   ├── e2e-motion-test-runner.js          # Master CLI Test Runner & Reporter
│   └── motion-tests/
│       ├── test-helpers.js                # Core test harness, AST parser, physics simulator, assertions
│       ├── test-tier1-features.js         # Tier 1: 20 Isolated Feature Coverage Tests
│       ├── test-tier2-boundaries.js       # Tier 2: 7 Boundary & Corner Case Tests
│       ├── test-tier3-interactions.js     # Tier 3: 8 Cross-Feature Interaction Tests
│       └── test-tier4-scenarios.js        # Tier 4: 12 Orchestrated Signature Moment Tests
```

---

## 3. Four-Tier Testing Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│               Tier 4: Real-World Application Scenarios                 │
│  (12 Signature Moments, YouTube Zero-Overlay Isolation, Celebrations)  │
├────────────────────────────────────────────────────────────────────────┤
│                 Tier 3: Cross-Feature Interactions                     │
│  (Reduce Motion + Confetti/Shaders, Gestures + Bottom Sheets, OTP)     │
├────────────────────────────────────────────────────────────────────────┤
│                  Tier 2: Boundary & Corner Cases                       │
│  (Particle Caps [60-80], Reduced Motion active, Low Tier, Error Shake) │
├────────────────────────────────────────────────────────────────────────┤
│                      Tier 1: Feature Coverage                          │
│  (Durations, Springs, Haptics, Context, Gestures, SVG, Shaders, Docs)   │
└────────────────────────────────────────────────────────────────────────┘
```

### Tier 1: Feature Coverage (Isolation)
Tests every feature from `PROJECT.md` in isolation against its interface contract:
- **F1**: Central Motion Tokens (`src/motion/tokens/` durations 120/200/300/500ms, springs snappy/smooth/bouncy/gentle, easings, layout presets, backward-compatible theme re-export in `src/theme/motion.ts`).
- **F2**: Safe Haptic Feedback Triggers (`src/motion/haptics/haptics.ts` web guard, reduce-motion flag, light/medium/heavy/selection/success/warning/error feedback).
- **F3**: Motion Context & Tiering (`MotionContext.ts`, `MotionProvider.tsx`, `useMotion.ts`, `useDeviceTier.ts`).
- **F4**: Defensive Error Boundaries (`MotionErrorBoundary.tsx`, `SkiaErrorBoundary.tsx`, `LottieErrorBoundary.tsx`).
- **F5**: Interactive Spring Components (`Button.tsx`, `Card.tsx`, `Chip.tsx`).
- **F6**: Segmented Tabs (`Tabs.tsx` sliding indicator pill, selection haptics).
- **F7**: Floating Label Input (`FloatingInput.tsx` animated floating label spring).
- **F8**: Animated OTP Boxes (`OtpBoxes.tsx` scale spring, horizontal error shake, haptics).
- **F9**: Swipe Actions Hook (`useSwipeAction.ts` RNGH2 Pan gesture).
- **F10**: Drag-to-Dismiss Bottom Sheet (`useBottomSheetGesture.ts`, `BottomSheet.tsx`).
- **F11**: Collapsing Header Hook (`useCollapsingHeader.ts` scroll interpolation).
- **F12**: Custom Pull-to-Refresh (`usePullToRefresh.ts` resistance and bouncy release).
- **F13**: Quiz Card Swipes (`useQuizCardSwipe.ts` rotation and velocity thresholds).
- **F14**: Smooth Layout Transitions (`LinearTransition` presets in `layout.ts`).
- **F15**: SVG Path Animations (`AnimatedProgressRing.tsx`, `ProgressBar`, `Checkmark`, `Cross`, `MorphingIcon`).
- **F16**: Skia Confetti Burst (`ConfettiBurst.tsx` capped 60-80 particles, 2500ms auto-unmount).
- **F17**: Skia Shaders (`SoftGradientBackground.tsx`, `ShimmerSkeleton.tsx`, `GlassBlur.tsx`).
- **F18**: YouTube Policy Compliance Guardrail (`app/live/[id].tsx`, `InAppStreamPlayer.tsx`).
- **F19**: 12 Orchestrated Moments Route Wiring.
- **F20**: Motion Documentation (`MOTION-SYSTEM.md`).

### Tier 2: Boundary & Corner Cases
Tests edge limits, degraded states, and extreme conditions:
- **B1**: Particle count boundaries (clamping `< 60` to 60, `> 80` capped to 80, 0 disabled, 2500ms auto-unmount timer teardown).
- **B2**: Reduced motion active degradation (strict `allowParticles = false`, `allowShaders = false`, haptic suppression, instant snapping).
- **B3**: Low-tier device & power-saver state (forces `tier = 'low'`, suppresses heavy shaders and particle loops).
- **B4**: Empty states and value limits (progress ring clamped `[0.0, 1.0]`, NaN safe, empty notification and syllabus states).
- **B5**: Error shake physics (decaying horizontal sinusoidal oscillation sequence `[-10, 10, -8, 8, -4, 4, 0]`, error haptic, instant typing reset).
- **B6**: Gesture velocity & overscroll boundaries (dismiss velocity threshold `>= 500` or distance `>= 150`, 4:1 rubber-band damping).
- **B7**: Error boundary crash containment (Skia and Lottie error boundary fallback rendering without bubbling).

### Tier 3: Cross-Feature Interactions
Tests multi-component reactive sequences and mutual exclusion:
- **C1**: Reduced motion + Confetti burst (immediate onComplete, 0 GPU particle allocations).
- **C2**: Reduced motion + Skia shaders (shader clock bypassed, static theme surface rendered).
- **C3**: Gestures + Bottom sheet nested scroll priority (pan activates dismiss only when inner scroll is at top `y <= 0`).
- **C4**: Login -> OTP shake -> Checkmark flow (phone submit -> staggered boxes -> error shake on invalid -> checkmark SVG draw on success).
- **C5**: Pull-to-refresh + Collapsing header coordination (overscroll triggers pull-to-refresh at top `y <= 0`; downward scroll collapses header `y > 0`).
- **C6**: Theme switch (Dark/Light) + Motion tokens stability (re-renders surfaces dynamically without breaking active springs).
- **C7**: Offline/Online transition + Banner layout animation (NetInfo disconnect triggers slide-down spring, reconnect fades out).
- **C8**: Checkout CTA -> Payment verification -> Confetti celebration pipeline.

### Tier 4: Real-World Application Scenarios (12 Orchestrated Moments)
Validates end-to-end user journeys across 12 screens:
- **S1**: Splash Screen Moment (`app/index.tsx`)
- **S2**: Login to OTP Moment (`app/(auth)/login.tsx` -> `app/(auth)/otp.tsx`)
- **S3**: First Home Load Moment (`app/(tabs)/index.tsx`)
- **S4**: Course Detail Moment (`app/course/[id].tsx`)
- **S5**: Checkout & Pay Moment (`app/checkout/[courseId].tsx` -> `app/payment/success.tsx`)
- **S6**: Lesson Complete Moment (`app/player/[lessonId].tsx`)
- **S7**: Quiz Moment (`app/quiz/[quizId].tsx` -> `app/quiz/result/[resultId].tsx`)
- **S8**: Course Completed / Certificate Moment (`app/certificate/[courseId].tsx`)
- **S9**: Live Class Moment (`app/live/[id].tsx` & `InAppStreamPlayer.tsx` YouTube Zero-Overlay compliance)
- **S10**: Notifications Moment (`app/notifications.tsx`)
- **S11**: Settings Moment (`app/settings/index.tsx`)
- **S12**: Reconnect Moment (`app/_layout.tsx` & `ConnectionBanner.tsx`)

---

## 4. Opaque-Box Methodology & Authoritative Output Derivation

All expected values and boundary conditions are derived directly from:
1. `ORIGINAL_REQUEST.md`: Exact duration milliseconds (120/200/300/500ms), 80-particle ceiling, 2500ms auto-unmount, YouTube developer policy.
2. `PROJECT.md`: Exact spring presets:
   - Snappy: `{ damping: 18, stiffness: 320, mass: 0.7 }` ($\zeta \approx 0.60$, underdamped tactile response)
   - Smooth: `{ damping: 24, stiffness: 180, mass: 1.0 }` ($\zeta \approx 0.89$, near critical damping)
   - Bouncy: `{ damping: 11, stiffness: 190, mass: 0.8 }` ($\zeta \approx 0.44$, underdamped accent)
   - Gentle: `{ damping: 28, stiffness: 140, mass: 1.2 }` ($\zeta \approx 1.08$, overdamped, zero overshoot)
3. YouTube Developer API Terms: Absolute prohibition of any floating overlay, watermark, badge, or gesture shield placed on top of the embedded YouTube player iframe.

---

## 5. Verification Engines & Simulators

- **Numerical Spring Simulator**: Solves $m \ddot{x} + c \dot{x} + k x = 0$ using 1ms discrete time steps to compute exact damping ratios, natural frequency, settling time, and maximum overshoot.
- **AST Structural Inspector**: Uses TypeScript compiler AST parsing to inspect JSX tree hierarchies, asserting zero sibling elements inside YouTube video player containers.
- **In-Memory Transpiler**: Sandboxed TypeScript compiler (`ts.transpileModule`) that executes modules with clean React Native and Reanimated mocks.

---

## 6. CLI Runner Usage & Flag Reference

### Running the Full Suite
```bash
node scripts/e2e-motion-test-runner.js
```

### Targeted Execution by Tier
```bash
node scripts/e2e-motion-test-runner.js --tier 1
node scripts/e2e-motion-test-runner.js --tier 2
node scripts/e2e-motion-test-runner.js --tier 3
node scripts/e2e-motion-test-runner.js --tier 4
```

### Targeted Execution by Milestone Gate
```bash
node scripts/e2e-motion-test-runner.js --milestone M1
node scripts/e2e-motion-test-runner.js --milestone M2
node scripts/e2e-motion-test-runner.js --milestone M3
node scripts/e2e-motion-test-runner.js --milestone M4
```

### Verbose Mode
Prints detailed diagnostic descriptions and individual assertion results:
```bash
node scripts/e2e-motion-test-runner.js --verbose
```

### Machine-Readable JSON Mode
Emits structured JSON output for CI/CD pipeline consumption:
```bash
node scripts/e2e-motion-test-runner.js --json
```

### Strict Mode (Milestone 5 Gate)
Fails with exit code 1 if any test is pending or failed:
```bash
node scripts/e2e-motion-test-runner.js --strict
```

---

## 7. Progressive Testability & Milestone Gates

The test runner operates under a **Dual-Track Progressive Testability Protocol**:
- Tests for components belonging to future milestones are clearly marked as `PENDING (Milestone M2/M3/M4)` without halting early milestone validation.
- All tests for completed milestones must pass with `100% PASS RATE`.
- In Milestone 5 (Final Acceptance), the `--strict` flag ensures 100% of all 49 tests pass cleanly.
