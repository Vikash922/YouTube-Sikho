import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { useMotion } from '../hooks/useMotion';

export interface MorphingIconProps {
  iconA: React.ReactNode;
  iconB: React.ReactNode;
  active: boolean;
  size?: number;
  durationMs?: number;
  style?: StyleProp<ViewStyle>;
}

export const MorphingIcon: React.FC<MorphingIconProps> = ({
  iconA,
  iconB,
  active,
  size = 24,
  durationMs = 250,
  style,
}) => {
  const { reduceMotion, springs } = useMotion();
  const transition = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      transition.value = active ? 1 : 0;
    } else {
      transition.value = withTiming(active ? 1 : 0, {
        duration: durationMs,
        easing: Easing.inOut(Easing.ease),
      });
    }
  }, [active, reduceMotion, durationMs, transition]);

  const styleA = useAnimatedStyle(() => {
    if (reduceMotion) {
      return {
        opacity: transition.value > 0.5 ? 0 : 1,
      };
    }
    return {
      opacity: 1 - transition.value,
      transform: [
        { rotate: `${-90 * transition.value}deg` },
        { scale: 1 - 0.3 * transition.value },
      ],
    };
  });

  const styleB = useAnimatedStyle(() => {
    if (reduceMotion) {
      return {
        opacity: transition.value > 0.5 ? 1 : 0,
      };
    }
    return {
      opacity: transition.value,
      transform: [
        { rotate: `${90 * (1 - transition.value)}deg` },
        { scale: 0.7 + 0.3 * transition.value },
      ],
    };
  });

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Animated.View style={[styles.layer, styleA]}>
        {iconA}
      </Animated.View>
      <Animated.View style={[styles.layer, styleB]}>
        {iconB}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  layer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
