import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';
import LottieView, { LottieViewProps } from 'lottie-react-native';
import { Sparkles } from 'lucide-react-native';
import { useMotion } from '../hooks';
import { LottieErrorBoundary } from '../boundaries/LottieErrorBoundary';
import { useTheme } from '../../theme';

export interface AnimatedLottieViewProps {
  source: string | { uri: string } | object;
  autoPlay?: boolean;
  loop?: boolean;
  style?: StyleProp<ViewStyle>;
  onAnimationFinish?: (isCancelled: boolean) => void;
  fallbackIcon?: React.ReactNode;
  fallbackSize?: number;
  testID?: string;
  speed?: number;
}

const BaseLottieInner: React.FC<AnimatedLottieViewProps> = ({
  source,
  autoPlay = true,
  loop = true,
  style,
  onAnimationFinish,
  fallbackIcon,
  fallbackSize = 36,
  testID,
  speed = 1,
}) => {
  const { reduceMotion, tier } = useMotion();
  const { colors } = useTheme();
  const animationRef = useRef<LottieView>(null);

  // If reduce motion is enabled, show static icon fallback
  if (reduceMotion) {
    return (
      <View style={[styles.center, style]} testID={testID}>
        {fallbackIcon || <Sparkles size={fallbackSize} color={colors.primary} />}
      </View>
    );
  }

  // On low-tier devices, restrict continuous looping to conserve battery
  const effectiveLoop = tier === 'low' ? false : loop;

  return (
    <View style={[styles.container, style]} testID={testID}>
      <LottieView
        ref={animationRef}
        source={source as LottieViewProps['source']}
        autoPlay={autoPlay}
        loop={effectiveLoop}
        speed={speed}
        onAnimationFinish={onAnimationFinish}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
};

export const AnimatedLottieView: React.FC<AnimatedLottieViewProps> = (props) => {
  return (
    <LottieErrorBoundary style={props.style} iconSize={props.fallbackSize}>
      <BaseLottieInner {...props} />
    </LottieErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
