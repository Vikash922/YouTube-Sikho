# 🎬 Mobile App Motion & Interaction System Design Guide

This document defines the complete motion, spring physics, gesture interaction, SVG path animation, and shader system for the course platform, aligned with **Expo SDK 58 (React Native 0.88)** and modeled after the **App Animation Cheat Sheet**.

---

## 1. Core Motion Tokens

All motion values reside in [`src/motion/tokens/`](src/motion/tokens/) and are re-exported through [`src/motion/`](src/motion/) and [`src/theme/motion.ts`](src/theme/motion.ts) for full backward compatibility.

### Durations
```typescript
export const MOTION_DURATIONS = {
  instant: 0,
  micro: 120,   // Quick state toggles, checkmarks, icon taps
  standard: 200, // Button presses, card scale, chip shifts
  medium: 300,   // Sheet reveals, modal presentations, tab sliders
  deliberate: 500 // Screen transitions, full-screen celebrations
} as const;
```

### Spring Presets
Physics parameters calibrated for harmonic response, zero perpetual jitter, and instant feel:
```typescript
export const MOTION_SPRINGS = {
  snappy: { damping: 20, stiffness: 300, mass: 0.8 },   // Buttons, chips, selectors
  smooth: { damping: 25, stiffness: 200, mass: 1.0 },   // Sheets, modals, collapsing headers
  bouncy: { damping: 12, stiffness: 180, mass: 0.9 },   // Success icons, celebration badges, pull-to-refresh
  gentle: { damping: 30, stiffness: 150, mass: 1.2 },   // Subtle background shifts, ambient cards
} as const;
```

### Easing Curves
```typescript
export const MOTION_EASINGS = {
  standard: Easing.bezier(0.2, 0.0, 0, 1.0),
  accelerate: Easing.bezier(0.3, 0.0, 0.8, 0.15),
  decelerate: Easing.bezier(0.05, 0.7, 0.1, 1.0),
  linear: Easing.linear,
} as const;
```

---

## 2. Responsive Springs & Component Interactions

### Springs Overview
Every tappable element in the design system uses Reanimated 4 springs rather than static linear fades:
- **`Button`** (`src/components/common/Button.tsx`): Compresses to `scale: 0.96` on touch down using `snappy` spring, snapping back to `1.0` on release, accompanied by an `expo-haptics` light tap.
- **`Card`** (`src/components/common/Card.tsx`): Smooth interactive press scale (`scale: 0.98`) with subtle elevation reduction.
- **`Chip`** (`src/components/common/Chip.tsx`): Physical scale pulse on toggle with active border color interpolation.
- **`Tabs`** (`src/components/common/Tabs.tsx`): Segmented tab row with an absolute sliding indicator pill driven by `smooth` spring tracking the active item layout index.
- **`FloatingInput`** (`src/components/common/FloatingInput.tsx`): Spring-animated label elevation moving from placeholder position into the top border notch, paired with an animated focus ring.
- **`OtpBoxes`** (`src/components/common/OtpBoxes.tsx`): Individual digit cells scale up on focus; on invalid OTP code entry, triggers horizontal harmonic error shake:
  `[0 -> -10 -> 10 -> -8 -> 8 -> -4 -> 4 -> 0] px` with error haptic feedback.

---

## 3. Gestures & Physics

Built exclusively using the modern **React Native Gesture Handler 2 (RNGH2)** hook API (`Gesture.Pan()`, `Gesture.Tap()`) paired with Reanimated worklets.

### 1. `useSwipeAction` (`src/motion/hooks/useSwipeAction.ts`)
- Used on notification list items and support tickets.
- Left swipe reveals delete action (red background with trash icon); right swipe triggers mark as read.
- Incorporates dynamic spring resistance past the 80px action threshold with a tactile selection haptic.

### 2. `useBottomSheetGesture` (`src/motion/hooks/useBottomSheetGesture.ts`)
- Velocity-aware drag-to-dismiss for modal filter sheets and avatar pickers.
- Dynamically snaps to predefined detents (`hidden`, `half`, `full`).
- Flinging downward with velocity $> 800\text{ px/s}$ dismisses immediately.
- Dimmed backdrop opacity tracks translateY continuously on the UI thread.

### 3. `useCollapsingHeader` (`src/motion/hooks/useCollapsingHeader.ts`)
- Linked to list scroll position via `useAnimatedScrollHandler`.
- Smoothly collapses large title from 32px to compact 18px navigation bar, interpolating opacity and elevation without layout jitter.

### 4. `usePullToRefresh` (`src/motion/hooks/usePullToRefresh.ts`)
- Natural rubber-band logarithmic overscroll resistance when pulled downward.
- Pull distance drives SVG spinner rotation and threshold haptic snap.

### 5. `useQuizCardSwipe` (`src/motion/hooks/useQuizCardSwipe.ts`)
- Horizontal question card swipe navigation with rotation tilt proportional to drag distance (`rotation = (translateX / screenWidth) * 15°`).
- Snaps to next question with bouncy spring or returns with rubber-band recovery.

---

## 4. SVG Path Animations

Implemented with `react-native-svg` and Reanimated `useAnimatedProps`:
1. **`AnimatedProgressRing`** (`src/motion/svg/AnimatedProgressRing.tsx`):
   - Dynamic stroke-dashoffset interpolation based on percentage (`0 -> 100%`).
   - Integrated count-up number text incrementing alongside the stroke.
2. **`AnimatedProgressBar`** (`src/motion/svg/AnimatedProgressBar.tsx`):
   - Linear progress tracker with spring ease and rounded cap styling.
3. **`AnimatedCheckmark` & `AnimatedCross`** (`src/motion/svg/`):
   - Clean SVG path length "draw" effect for OTP verification, payment success, and quiz evaluation results.
4. **`MorphingIcon`** (`src/motion/svg/MorphingIcon.tsx`):
   - Smooth path interpolation between state icons (Play $\leftrightarrow$ Pause, Check $\leftrightarrow$ X).

---

## 5. Skia Particles & Runtime Shaders

### Particles: `ConfettiBurst` (`src/motion/particles/ConfettiBurst.tsx`)
- Physics-based particle simulation utilizing `@shopify/react-native-skia`.
- **Strict Hard Cap**: Exactly 60–80 particles spawned per burst.
- **Physics Modeling**: Gravity ($g = 980\text{ px/s}^2$), initial velocity vectors, atmospheric air drag, and 3D rotational spin.
- **Auto-Unmounting**: Automatically cleans up and unmounts the Skia canvas once all particles fall below the viewport (duration $< 2.5\text{s}$).
- **Safety Gate**: Disabled completely when Reduce Motion is active or on low-tier devices.

### Shaders: SkSL Runtime Effects (`src/motion/shaders/`)
- **`SoftGradientBackground`**: Slow, continuous ambient background color wave across Home hero, Splash, and Login cards. Low computational cost, throttled to 30fps on battery saver.
- **`ShimmerSkeleton`**: Replaces generic static grey boxes with a shader-driven gradient sweep matching the layout structure of courses and banners.
- **`GlassBlur`**: Subtle frosted-glass surface emulation for floating navigation pills.

---

## 6. Strict YouTube Developer Policy Compliance

> [!IMPORTANT]
> In strict compliance with YouTube API Services Developer Policies, video lessons and live streams embed the official YouTube IFrame player (`src/components/video/InAppStreamPlayer.tsx`, `app/player/[lessonId].tsx`, and `app/live/[id].tsx`).

### Zero-Overlay Architecture Invariant:
1. **No Overlays**: Absolutely zero animated layers, particles, shaders, gestures, or floating controls are rendered on top of the YouTube video player.
2. **Structural Isolation**: The YouTube player container is isolated in its own dedicated viewport box.
3. **Motion Boundary**: All animations (progress bars, lesson checklists, live chat streams, hand-raise buttons) execute strictly **outside** the player container (above or below).
4. **No Obfuscation**: The video player controls, subtitles, branding, and ads remain 100% visible, unobstructed, and clickable at all times.

---

## 7. Accessibility, Performance Tiering & Reduced Motion

The motion system is governed by `MotionProvider` (`src/motion/context/MotionProvider.tsx`):

### Reduced Motion Guarantee:
- Honors the OS-level `prefers-reduced-motion` accessibility flag.
- When enabled:
  - Spring translations and scale transforms collapse to instant transitions or simple $150\text{ms}$ cross-fades.
  - `ConfettiBurst` and particle engines spawn 0 particles.
  - Skia runtime shaders fall back to static solid colors and standard gradients.
  - Looping ambient animations freeze at their resting frame.

### Device Performance Tiering:
- **High Tier**: Full physics, Skia shaders, dynamic particle bursts, glass blurs.
- **Low Tier / Power-Saver**:
  - Shaders disabled (solid backgrounds).
  - Confetti particle count reduced to 0 or replaced with an animated SVG badge.
  - Complex gestures use linear interpolation.

---

## 8. The 12 Orchestrated Moments (Move + React + Celebrate)

Each signature user moment is carefully choreographed with specific entry, interaction, and celebration timings:

| # | Moment | Route Target | Entry Animation | Reaction Physics | Celebration / Output |
|---|---|---|---|---|---|
| **1** | **Splash Screen** | `app/index.tsx` | Logo scale + fade | Soft ambient background gradient | Tagline fade-in, clean route transition |
| **2** | **Login to OTP** | `app/(auth)/otp.tsx` | Shared card slide | Floating label rise + focus ring | Error shake on mismatch; Checkmark draw on verified |
| **3** | **First Home Load** | `app/(tabs)/index.tsx` | Shimmer skeletons | Staggered section fade-in (40ms) | Banner carousel parallax slide |
| **4** | **Course Detail** | `app/course/[id].tsx` | Sticky footer spring-in | Collapsing header on scroll | Instant tab pill indicator response |
| **5** | **Checkout & Purchase** | `app/payment/success.tsx` | Order summary slide-up | Pay button morphs to spinner | Confetti burst (80 pcs) + checkmark draw + success haptic |
| **6** | **Lesson Complete** | `app/player/[lessonId].tsx` | Next lesson slide-in | Progress ring fills smoothly | Subtle checkmark bounce (outside YouTube player) |
| **7** | **Quiz Completion** | `app/quiz/result/[id].tsx` | Score count-up (0 -> X%) | Timer ring warning shake in last 10s | Pass: Confetti burst + badge shine; Fail: gentle retry bounce |
| **8** | **Certificate Earned** | `app/certificate/[id].tsx` | Certificate card reveal | Card 3D shine tilt | Golden burst + share button spring pop |
| **9** | **Live Masterclass** | `app/live/[id].tsx` | Pulsing red `LIVE` badge | Hand-raise spring button bounce | Chat messages slide up smoothly |
| **10** | **Notifications Desk** | `app/notifications.tsx` | Staggered list entrance | Swipe left/right drag-to-delete | Spring snap-back with deletion haptic |
| **11** | **Settings & Theme** | `app/(tabs)/profile.tsx` | Smooth cross-fade | Switch toggle spring snap | Zero-flicker dark/light transition |
| **12** | **Network State** | `app/_layout.tsx` | Offline banner slide-down | Spring bounce on reconnect | Green checkmark pulse before dismiss |

---

## 9. Performance Budget & Quality Gates

To maintain smooth **60 FPS** on mid-range Android devices:
1. **Transform & Opacity Only**: Never animate `width`, `height`, `top`, or `left` inside render loops; all layouts use native GPU-backed transforms (`transform: [{ translateX }, { scale }]`).
2. **UI Thread Execution**: All gesture calculations and spring updates run on the UI thread via Reanimated worklets.
3. **Zero State Updates in Animation Frames**: Frame drivers never invoke `setState` per tick.
4. **Defensive Error Boundaries**: All Skia, Lottie, and SVG rendering elements are wrapped in `MotionErrorBoundary` with static fallbacks to prevent screen crashes.
