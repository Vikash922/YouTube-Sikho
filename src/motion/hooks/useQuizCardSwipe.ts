/**
 * QUIZ CARD SWIPE HOOK
 * -------------------------------------------------------------
 * Horizontal card swipe gesture with angular rotation,
 * directional velocity snapping, and tactile question transitions.
 */

import { useCallback } from 'react';
import { Dimensions } from 'react-native';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface UseQuizCardSwipeOptions {
  onNext?: () => void;
  onPrev?: () => void;
  threshold?: number; // default 100
  velocityThreshold?: number; // default 600
  enabled?: boolean;
}

export function useQuizCardSwipe({
  onNext,
  onPrev,
  threshold = 100,
  velocityThreshold = 600,
  enabled = true,
}: UseQuizCardSwipeOptions = {}) {
  const shouldReduceMotion = useReducedMotion();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const notifyHaptic = useCallback(() => {
    triggerHaptic('light', shouldReduceMotion);
  }, [shouldReduceMotion]);

  const notifyNext = useCallback(() => {
    onNext?.();
    // Reset from opposite side
    translateX.value = SCREEN_WIDTH * 0.4;
    translateX.value = withSpring(0, motionSprings.snappy);
    translateY.value = withSpring(0, motionSprings.snappy);
  }, [onNext, translateX, translateY]);

  const notifyPrev = useCallback(() => {
    onPrev?.();
    // Reset from opposite side
    translateX.value = -SCREEN_WIDTH * 0.4;
    translateX.value = withSpring(0, motionSprings.snappy);
    translateY.value = withSpring(0, motionSprings.snappy);
  }, [onPrev, translateX, translateY]);

  const gesture = Gesture.Pan()
    .enabled(enabled)
    .activeOffsetX([-15, 15])
    .onUpdate((event) => {
      'worklet';
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.15;
    })
    .onEnd((event) => {
      'worklet';
      const x = event.translationX;
      const vx = event.velocityX;

      // Swipe Left -> Next question
      if (x < -threshold || vx < -velocityThreshold) {
        if (notifyHaptic) runOnJS(notifyHaptic)();
        translateX.value = withTiming(-SCREEN_WIDTH * 1.2, { duration: 180 }, (finished) => {
          if (finished && notifyNext) {
            runOnJS(notifyNext)();
          }
        });
        return;
      }

      // Swipe Right -> Previous question
      if (x > threshold || vx > velocityThreshold) {
        if (notifyHaptic) runOnJS(notifyHaptic)();
        translateX.value = withTiming(SCREEN_WIDTH * 1.2, { duration: 180 }, (finished) => {
          if (finished && notifyPrev) {
            runOnJS(notifyPrev)();
          }
        });
        return;
      }

      // Cancellation: Snap back to center
      translateX.value = withSpring(0, motionSprings.snappy);
      translateY.value = withSpring(0, motionSprings.snappy);
    });

  const cardAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    if (shouldReduceMotion) {
      return {
        transform: [{ translateX: translateX.value }],
      };
    }

    // rotation = (translationX / SCREEN_WIDTH) * 12deg
    const rotationDeg = (translateX.value / SCREEN_WIDTH) * 12;

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotationDeg}deg` },
      ],
    };
  });

  const reset = useCallback(() => {
    translateX.value = withSpring(0, motionSprings.snappy);
    translateY.value = withSpring(0, motionSprings.snappy);
  }, [translateX, translateY]);

  return {
    gesture,
    translateX,
    cardAnimatedStyle,
    reset,
  };
}
