/**
 * MOTION SYSTEM SPRING PRESETS
 * -------------------------------------------------------------
 * snappy: Responsive tactile feedback (buttons, toggles, chips)
 * smooth: Controlled spatial motion (sheets, tabs, cards)
 * bouncy: Playful accents (celebrations, badges, pull-to-refresh)
 * gentle: Clamped soft transitions (accordions, dismissals)
 */

export interface SpringPreset {
  damping: number;
  stiffness: number;
  mass: number;
  overshootClamping?: boolean;
}

export const motionSprings: Record<'snappy' | 'smooth' | 'bouncy' | 'gentle', SpringPreset> = {
  snappy: {
    damping: 18,
    stiffness: 320,
    mass: 0.7,
    overshootClamping: false,
  },
  smooth: {
    damping: 24,
    stiffness: 180,
    mass: 1.0,
    overshootClamping: false,
  },
  bouncy: {
    damping: 11,
    stiffness: 190,
    mass: 0.8,
    overshootClamping: false,
  },
  gentle: {
    damping: 28,
    stiffness: 140,
    mass: 1.2,
    overshootClamping: true,
  },
} as const;

export type MotionSpring = keyof typeof motionSprings;
