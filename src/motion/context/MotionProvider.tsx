import React, { useState, useEffect, useMemo, ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';
import { MotionContext, MotionContextValue, DeviceTier } from './MotionContext';
import { useDeviceTier } from '../hooks/useDeviceTier';

export interface MotionProviderProps {
  children: ReactNode;
  initialTierOverride?: DeviceTier | 'auto';
  initialReduceMotionOverride?: boolean | 'auto';
}

export const MotionProvider: React.FC<MotionProviderProps> = ({
  children,
  initialTierOverride = 'auto',
  initialReduceMotionOverride = 'auto',
}) => {
  const [osReduceMotion, setOsReduceMotion] = useState<boolean>(false);
  const [tierOverride, setTierOverride] = useState<DeviceTier | 'auto'>(initialTierOverride);
  const [reduceMotionOverride, setReduceMotionOverride] = useState<boolean | 'auto'>(
    initialReduceMotionOverride
  );

  const { tier: hardwareTier, isPowerSaver } = useDeviceTier();

  useEffect(() => {
    let isMounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (isMounted) {
          setOsReduceMotion(Boolean(enabled));
        }
      })
      .catch(() => {});

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled: boolean) => {
        if (isMounted) {
          setOsReduceMotion(enabled);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription?.remove?.();
    };
  }, []);

  const value: MotionContextValue = useMemo(() => {
    const effectiveReduceMotion =
      reduceMotionOverride === 'auto' ? osReduceMotion : reduceMotionOverride;

    const effectiveTier: DeviceTier = isPowerSaver
      ? 'low'
      : tierOverride === 'auto'
      ? hardwareTier
      : tierOverride;

    // Reduce motion disables all particle bursts and complex shaders
    // Low tier / power-saver disables particles and shaders
    // Medium tier allows capped particles, but disables complex shaders (falls back to linear gradients)
    // High tier allows both
    const allowParticles = !effectiveReduceMotion && effectiveTier !== 'low';
    const allowShaders = !effectiveReduceMotion && effectiveTier === 'high';

    return {
      reduceMotion: effectiveReduceMotion,
      tier: effectiveTier,
      allowParticles,
      allowShaders,
      isPowerSaver,
      setTierOverride,
      setReduceMotionOverride,
    };
  }, [
    osReduceMotion,
    reduceMotionOverride,
    hardwareTier,
    tierOverride,
    isPowerSaver,
  ]);

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
};
