/**
 * MOTION SYSTEM LAYOUT TRANSITIONS
 * -------------------------------------------------------------
 * LinearTransition presets for animated layout changes (lists, accordions, dynamic cards).
 */

import { LinearTransition } from 'react-native-reanimated';

export const motionLayout = {
  snappy: LinearTransition.springify().damping(18).stiffness(320).mass(0.7),
  smooth: LinearTransition.springify().damping(24).stiffness(180).mass(1.0),
  bouncy: LinearTransition.springify().damping(11).stiffness(190).mass(0.8),
  gentle: LinearTransition.springify().damping(28).stiffness(140).mass(1.2),
};

export type MotionLayout = typeof motionLayout;
