/**
 * SWIPE ACTION GESTURE HOOK
 * -------------------------------------------------------------
 * RNGH2 Pan Gesture for swipe-to-reveal / swipe-to-dismiss actions
 * (e.g. notifications, messages, list items).
 */

import { useCallback, useState } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  useReducedMotion,
} from 'react-native-reanimated';
import { motionSprings } from '../tokens/springs';
import { triggerHaptic } from '../haptics/haptics';

export interface UseSwipeActionOptions {
  onDelete?: () => void;
  revealWidth?: number; // default 80
  dismissThreshold?: number; // default 140
  velocityThreshold?: number; // default -500
  disabled?: boolean;
}

export function useSwipeAction({
  onDelete,
  revealWidth = 80,
  dismissThreshold = 140,
  velocityThreshold = -500,
  disabled = false,
}: UseSwipeActionOptions = {}) {
  const shouldReduceMotion = useReducedMotion();
  const translateX = useSharedValue(0);
  const itemHeight = useSharedValue<number | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  const notifyHaptic = useCallback(() => {
    triggerHaptic('medium', shouldReduceMotion);
  }, [shouldReduceMotion]);

  const notifyDelete = useCallback(() => {
    setIsDismissed(true);
    onDelete?.();
  }, [onDelete]);

  const gesture = Gesture.Pan()
    .enabled(!disabled && !isDismissed)
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      'worklet';
      // Only allow dragging left (negative X), clamped at max reveal / dismissal
      const rawX = event.translationX;
      if (rawX < 0) {
        translateX.value = Math.max(rawX, -dismissThreshold - 40);
      } else {
        // Slight resistance when dragging right
        translateX.value = rawX * 0.15;
      }
    })
    .onEnd((event) => {
      'worklet';
      const x = event.translationX;
      const vx = event.velocityX;

      // 1. Full swipe-to-dismiss threshold
      if (x < -dismissThreshold || vx < -1000) {
        translateX.value = withTiming(-400, { duration: 180 }, (finished) => {
          if (finished && notifyDelete) {
            runOnJS(notifyDelete)();
          }
        });
        return;
      }

      // 2. Snap to reveal action threshold
      const snapThreshold = -(revealWidth * 0.7); // e.g. -56 or -70
      if (x < snapThreshold || vx < velocityThreshold) {
        translateX.value = withSpring(-revealWidth, motionSprings.snappy);
        if (notifyHaptic) {
          runOnJS(notifyHaptic)();
        }
      } else {
        // 3. Snap back to original position
        translateX.value = withSpring(0, motionSprings.snappy);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const reset = useCallback(() => {
    translateX.value = withSpring(0, motionSprings.snappy);
    setIsDismissed(false);
  }, [translateX]);

  const snapToReveal = useCallback(() => {
    translateX.value = withSpring(-revealWidth, motionSprings.snappy);
  }, [revealWidth, translateX]);

  return {
    gesture,
    animatedStyle,
    translateX,
    isDismissed,
    reset,
    snapToReveal,
  };
}
