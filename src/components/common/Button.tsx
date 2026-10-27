import React, { useEffect } from 'react';
import {
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
  Pressable,
  View,
  AccessibilityRole,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import { motionSprings, motionDurations, triggerHaptic } from '../../motion';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  accessibilityRole = 'button',
  accessibilityLabel,
}) => {
  const { colors, radius, typography, spacing, shadows } = useTheme();
  const shouldReduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(disabled || loading ? 0.5 : 1);

  useEffect(() => {
    opacity.value = withTiming(disabled || loading ? 0.5 : 1, {
      duration: motionDurations.fast,
    });
  }, [disabled, loading, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shouldReduceMotion ? 1 : scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    if (disabled || loading) return;
    scale.value = withSpring(0.97, motionSprings.snappy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, motionSprings.snappy);
  };

  const handlePress = () => {
    if (disabled || loading) return;
    triggerHaptic('light', shouldReduceMotion);
    onPress();
  };

  // Mobile ergonomics: minimum 48px touch target
  const height = size === 'sm' ? 44 : size === 'lg' ? 56 : 50;
  const paddingH = size === 'sm' ? spacing.base : size === 'lg' ? spacing.xl : spacing.screen;

  const isPrimary = variant === 'primary' && !disabled;
  const isSecondary = variant === 'secondary' || variant === 'outline';
  const isGhost = variant === 'ghost';
  const isDanger = variant === 'danger';

  const getTextColor = () => {
    if (disabled) return colors.textMuted;
    if (isPrimary) return '#FFFFFF';
    if (isDanger) return '#FFFFFF';
    if (isSecondary) return colors.text;
    if (isGhost) return colors.primary;
    return '#FFFFFF';
  };

  const content = (
    <View style={styles.innerContent}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={getTextColor()}
          style={{ marginRight: spacing.sm }}
        />
      ) : icon ? (
        <View style={{ marginRight: spacing.sm }}>{icon}</View>
      ) : null}
      <Text
        style={[
          typography.heading,
          styles.text,
          { color: getTextColor() },
          textStyle,
        ]}
      >
        {loading ? 'Please wait...' : title}
      </Text>
    </View>
  );

  return (
    <AnimatedPressable
      accessible={true}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: disabled || loading }}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        styles.base,
        {
          minHeight: 48,
          height,
          borderRadius: radius.button, // 12px
        },
        animatedStyle,
        isPrimary ? shadows.sm : null,
        style,
      ]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={colors.primaryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradient,
            {
              borderRadius: radius.button,
              paddingHorizontal: paddingH,
            },
          ]}
        >
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.solidWrapper,
            {
              borderRadius: radius.button,
              paddingHorizontal: paddingH,
              backgroundColor: disabled
                ? colors.surfaceSubtle
                : isDanger
                ? colors.error
                : isSecondary
                ? colors.surface
                : 'transparent',
              borderColor: isSecondary ? colors.border : 'transparent',
              borderWidth: isSecondary ? 1 : 0,
            },
          ]}
        >
          {content}
        </View>
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  base: {
    width: '100%',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  solidWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
  },
});
