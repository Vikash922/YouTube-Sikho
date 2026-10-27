import { useContext } from 'react';
import { MotionContext, MotionContextValue } from '../context/MotionContext';
import { triggerHaptic, HapticFeedbackType } from '../haptics';
import { motionDurations, motionSprings, motionEasings, motionLayout } from '../tokens';

export interface UseMotionReturn extends MotionContextValue {
  haptic: (type?: HapticFeedbackType) => Promise<void>;
  durations: typeof motionDurations;
  springs: typeof motionSprings;
  easings: typeof motionEasings;
  layout: typeof motionLayout;
}

const defaultMotionValue: MotionContextValue = {
  reduceMotion: false,
  tier: 'high',
  allowParticles: true,
  allowShaders: true,
  isPowerSaver: false,
  setTierOverride: () => {},
  setReduceMotionOverride: () => {},
};

export function useMotion(): UseMotionReturn {
  const context = useContext(MotionContext);
  const value = context ?? defaultMotionValue;

  const haptic = (type: HapticFeedbackType = 'light') =>
    triggerHaptic(type, value.reduceMotion);

  return {
    ...value,
    haptic,
    durations: motionDurations,
    springs: motionSprings,
    easings: motionEasings,
    layout: motionLayout,
  };
}
