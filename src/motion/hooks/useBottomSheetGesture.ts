/**
 * BOTTOM SHEET GESTURE HOOK
 * -------------------------------------------------------------
 * Velocity-aware drag-to-dismiss Pan gesture with rubber-band
 * upward resistance and nested scroll negotiation.
 */

import { useCallback } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  useReducedMotion,
} from 'react-native-reanimated';
import { motionSprings } from '../tokens/springs';
import { triggerHaptic } from '../haptics/haptics';

export interface UseBottomSheetGestureOptions {
  onClose: () => void;
  sheetHeight?: number; // default 500
  dismissThreshold?: number; // default 150
  velocityThreshold?: number; // default 600
  scrollOffset?: { value: number }; // shared value for scroll position negotiation
  enabled?: boolean;
}

export function useBottomSheetGesture({
  onClose,
  sheetHeight = 500,
  dismissThreshold = 150,
  velocityThreshold = 600,
  scrollOffset,
  enabled = true,
}: UseBottomSheetGestureOptions) {
  const shouldReduceMotion = useReducedMotion();
  const translateY = useSharedValue(0);
  const hasTriggeredThresholdHaptic = useSharedValue(false);

  const notifyHaptic = useCallback(() => {
    triggerHaptic('medium', shouldReduceMotion);
  }, [shouldReduceMotion]);

  const notifyClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const gesture = Gesture.Pan()
    .enabled(enabled)
    .onStart(() => {
      'worklet';
      hasTriggeredThresholdHaptic.value = false;
    })
    .onUpdate((event) => {
      'worklet';
      // Nested scroll negotiation: only drag when scroll is at top (scrollOffset <= 0)
      if (scrollOffset && scrollOffset.value > 0) {
        return;
      }

      const rawY = event.translationY;
      if (rawY < 0) {
        // Upward dragging rubber-band damping (0.25 resistance factor)
        translateY.value = rawY * 0.25;
      } else {
        // Downward drag 1:1
        translateY.value = rawY;

        // Threshold crossing haptic trigger
        if (rawY > dismissThreshold && !hasTriggeredThresholdHaptic.value) {
          hasTriggeredThresholdHaptic.value = true;
          if (notifyHaptic) {
            runOnJS(notifyHaptic)();
          }
        }
      }
    })
    .onEnd((event) => {
      'worklet';
      if (scrollOffset && scrollOffset.value > 0) {
        return;
      }

      const y = event.translationY;
      const vy = event.velocityY;

      const shouldDismiss = y > dismissThreshold || vy > velocityThreshold;

      if (shouldDismiss) {
        translateY.value = withSpring(sheetHeight, motionSprings.smooth, (finished) => {
          if (finished && notifyClose) {
            runOnJS(notifyClose)();
          }
        });
      } else {
        translateY.value = withSpring(0, motionSprings.snappy);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const reset = useCallback(() => {
    translateY.value = withSpring(0, motionSprings.snappy);
  }, [translateY]);

  return {
    gesture,
    translateY,
    animatedStyle,
    reset,
  };
}
