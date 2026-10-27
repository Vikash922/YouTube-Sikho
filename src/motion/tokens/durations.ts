/**
 * MOTION SYSTEM DURATIONS (Milliseconds)
 * -------------------------------------------------------------
 * instant: 120ms - Micro-interactions (icon scale down, toggle flick, checkbox tick)
 * fast: 200ms    - Tactile interactions (button release, card press, chip toggle)
 * normal: 300ms  - Spatial transitions (modal presentation, sheet reveal, accordion expand)
 * slow: 500ms    - Deliberate celebrations (confetti explosion, certificate ribbon reveal)
 */

export const motionDurations = {
  instant: 120,
  fast: 200,
  normal: 300,
  slow: 500,
} as const;

export type MotionDuration = keyof typeof motionDurations;
