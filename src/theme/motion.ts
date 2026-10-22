/**
 * MOTION SYSTEM TOKENS (Spring-Based Physics)
 * -------------------------------------------------------------
 * Strictly 2 presets:
 *  - snappy: For tactile interactions (buttons, toggles, badges, chips)
 *  - smooth: For spatial transitions (screens, bottom sheets, cards, sliding pill)
 */

export const motion = {
  presets: {
    snappy: {
      damping: 15,
      stiffness: 350,
      mass: 0.6,
    },
    smooth: {
      damping: 20,
      stiffness: 180,
      mass: 1,
    },
  },
  durations: {
    instant: 150,
    quick: 200,
    base: 250,
  },
  pressScale: 0.97,
} as const;

export type Motion = typeof motion;
