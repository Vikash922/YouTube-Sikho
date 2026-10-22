import React from 'react';
import { StyleSheet, ViewStyle, StyleProp, Pressable, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  padding?: number;
  variant?: 'default' | 'hero';
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  style,
  elevated = false,
  padding,
  variant = 'default',
}) => {
  const { colors, radius, spacing, shadows, motion } = useTheme();
  const shouldReduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shouldReduceMotion ? 1 : scale.value }],
  }));

  const handlePressIn = () => {
    if (!onPress) return;
    scale.value = withSpring(motion.pressScale, motion.presets.snappy);
  };

  const handlePressOut = () => {
    if (!onPress) return;
    scale.value = withSpring(1, motion.presets.snappy);
  };

  const handlePress = () => {
    if (!onPress) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const cornerRadiusStyle =
    variant === 'hero'
      ? radius.heroCard // Asymmetric corners: 28, 28, 28, 8
      : { borderRadius: radius.card }; // Standard 20px

  const cardStyle = [
    styles.card,
    cornerRadiusStyle,
    {
      backgroundColor: elevated ? colors.surfaceElevated : colors.surface,
      borderColor: colors.border,
      padding: padding !== undefined ? padding : spacing.base,
    },
    elevated ? shadows.md : shadows.sm,
    style,
  ];

  if (!onPress) {
    return <View style={cardStyle}>{children}</View>;
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[cardStyle, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
});
