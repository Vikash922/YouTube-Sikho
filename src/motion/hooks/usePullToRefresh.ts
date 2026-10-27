/**
 * CUSTOM PULL-TO-REFRESH HOOK
 * -------------------------------------------------------------
 * Custom pull-to-refresh gesture physics with exponential damping,
 * threshold haptic feedback, and bouncy spring release.
 */

import { useState, useCallback } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
  useReducedMotion,
} from 'react-native-reanimated';
import { motionSprings } from '../tokens/springs';
import { triggerHaptic } from '../haptics/haptics';

export interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number; // default 80
  holdOffset?: number; // default 60
  enabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  holdOffset = 60,
  enabled = true,
}: UsePullToRefreshOptions) {
  const shouldReduceMotion = useReducedMotion();
  const pullDistance = useSharedValue(0);
  const isRefreshing = useSharedValue(false);
  const [refreshing, setRefreshing] = useState(false);
  const hasTriggeredHaptic = useSharedValue(false);

  const notifyThresholdHaptic = useCallback(() => {
    triggerHaptic('medium', shouldReduceMotion);
  }, [shouldReduceMotion]);

  const executeRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
      isRefreshing.value = false;
      pullDistance.value = withSpring(0, motionSprings.bouncy);
    }
  }, [onRefresh, isRefreshing, pullDistance]);

  const gesture = Gesture.Pan()
    .enabled(enabled && !refreshing)
    .onStart(() => {
      'worklet';
      hasTriggeredHaptic.value = false;
    })
    .onUpdate((event) => {
      'worklet';
      if (isRefreshing.value) return;

      const rawY = event.translationY;
      if (rawY > 0) {
        // Apply exponential resistance curve: Math.pow(pullDistance, 0.85)
        const resisted = Math.pow(rawY, 0.85);
        pullDistance.value = resisted;

        if (resisted >= threshold && !hasTriggeredHaptic.value) {
          hasTriggeredHaptic.value = true;
          if (notifyThresholdHaptic) {
            runOnJS(notifyThresholdHaptic)();
          }
        }
      } else {
        pullDistance.value = 0;
      }
    })
    .onEnd(() => {
      'worklet';
      if (isRefreshing.value) return;

      if (pullDistance.value >= threshold) {
        isRefreshing.value = true;
        pullDistance.value = withSpring(holdOffset, motionSprings.snappy);
        if (executeRefresh) {
          runOnJS(executeRefresh)();
        }
      } else {
        pullDistance.value = withSpring(0, motionSprings.bouncy);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateY: pullDistance.value }],
    };
  });

  const indicatorAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    const rotation = interpolate(
      pullDistance.value,
      [0, threshold],
      [0, 360],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      pullDistance.value,
      [0, 20, threshold],
      [0, 0.4, 1],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  return {
    gesture,
    pullDistance,
    refreshing,
    animatedStyle,
    indicatorAnimatedStyle,
  };
}
