/**
 * MOTION SYSTEM EASING CURVES
 * -------------------------------------------------------------
 * Standardized easing curves for non-spring spatial transitions.
 */

import { Easing } from 'react-native-reanimated';

export const motionEasings = {
  standard: Easing.bezier(0.2, 0.0, 0, 1.0),
  standardAccelerate: Easing.bezier(0.3, 0.0, 1, 1.0),
  standardDecelerate: Easing.bezier(0.0, 0.0, 0.2, 1.0),
  emphasized: Easing.bezier(0.2, 0.0, 0, 1.0),
  emphasizedDecelerate: Easing.bezier(0.05, 0.7, 0.1, 1.0),
  emphasizedAccelerate: Easing.bezier(0.3, 0.0, 0.8, 0.15),
  easeOut: Easing.out(Easing.ease),
  easeInOut: Easing.inOut(Easing.ease),
  linear: Easing.linear,
} as const;

export type MotionEasing = keyof typeof motionEasings;
