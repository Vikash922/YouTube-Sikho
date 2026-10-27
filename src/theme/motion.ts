/**
 * MOTION SYSTEM THEME TOKENS
 * -------------------------------------------------------------
 * Re-exports central motion tokens from src/motion while preserving
 * backward compatibility for existing useTheme().motion consumers.
 */

import {
  motionDurations,
  motionSprings,
  motionEasings,
  motionLayout,
} from '../motion/tokens';

export const motion = {
  presets: {
    snappy: motionSprings.snappy,
    smooth: motionSprings.smooth,
    bouncy: motionSprings.bouncy,
    gentle: motionSprings.gentle,
  },
  durations: {
    ...motionDurations,
    // Backward compatibility aliases
    quick: motionDurations.fast,
    base: 250,
  },
  pressScale: 0.97,
  springs: motionSprings,
  easings: motionEasings,
  layout: motionLayout,
} as const;

export type Motion = typeof motion;

// Re-export central tokens
export * from '../motion/tokens';
