import { createContext } from 'react';

export type DeviceTier = 'high' | 'medium' | 'low';

export interface MotionContextValue {
  reduceMotion: boolean;
  tier: DeviceTier;
  allowParticles: boolean;
  allowShaders: boolean;
  isPowerSaver: boolean;
  setTierOverride: (tier: DeviceTier | 'auto') => void;
  setReduceMotionOverride: (enabled: boolean | 'auto') => void;
}

export const MotionContext = createContext<MotionContextValue | undefined>(undefined);
