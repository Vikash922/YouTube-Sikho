/**
 * COLLAPSING HEADER HOOK
 * -------------------------------------------------------------
 * Scroll-driven height, title opacity, and elevation interpolation
 * for rich collapsible headers.
 */

import {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

export interface CollapsingHeaderOptions {
  maxHeight: number; // e.g. 180
  minHeight: number; // e.g. 64
}

export function useCollapsingHeader({
  maxHeight,
  minHeight,
}: CollapsingHeaderOptions) {
  const scrollY = useSharedValue(0);
  const scrollRange = Math.max(1, maxHeight - minHeight);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    const height = interpolate(
      scrollY.value,
      [0, scrollRange],
      [maxHeight, minHeight],
      Extrapolation.CLAMP
    );
    const borderOpacity = interpolate(
      scrollY.value,
      [0, scrollRange],
      [0, 1],
      Extrapolation.CLAMP
    );

    return {
      height,
      borderBottomWidth: borderOpacity > 0.05 ? 1 : 0,
    };
  });

  const largeTitleAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    const opacity = interpolate(
      scrollY.value,
      [0, Math.min(80, scrollRange)],
      [1, 0],
      Extrapolation.CLAMP
    );
    const translateY = interpolate(
      scrollY.value,
      [0, Math.min(80, scrollRange)],
      [0, -10],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  const compactTitleAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    const opacity = interpolate(
      scrollY.value,
      [Math.min(60, scrollRange), Math.min(120, scrollRange)],
      [0, 1],
      Extrapolation.CLAMP
    );

    return {
      opacity,
    };
  });

  return {
    scrollY,
    scrollHandler,
    headerAnimatedStyle,
    largeTitleAnimatedStyle,
    compactTitleAnimatedStyle,
  };
}
