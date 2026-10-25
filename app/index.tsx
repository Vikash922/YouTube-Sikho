import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  useReducedMotion,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppInit } from '../src/hooks/useAppInit';
import { useAuthStore } from '../src/store/useAuthStore';
import { useTheme } from '../src/theme';
import { clientConfig } from '../src/config/client.config';

export default function SplashScreen() {
  const router = useRouter();
  const { colors, typography, shadows, spacing } = useTheme();
  const { isReady, isMaintenanceMode } = useAppInit();
  const { user, profile } = useAuthStore();
  const shouldReduceMotion = useReducedMotion();

  const logoScale = useSharedValue(0.85);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    if (shouldReduceMotion) {
      logoScale.value = 1;
      logoOpacity.value = 1;
      textOpacity.value = 1;
      return;
    }

    logoOpacity.value = withTiming(1, { duration: 300 });
    logoScale.value = withSpring(1, { damping: 14, stiffness: 200 });
    textOpacity.value = withTiming(1, { duration: 400 });
  }, [shouldReduceMotion]);

  const navigateToNextScreen = () => {
    if (isMaintenanceMode) {
      router.replace('/maintenance');
    } else if (!user) {
      router.replace('/(auth)/login');
    } else if (!profile || !profile.name) {
      router.replace('/(auth)/profile-setup');
    } else {
      router.replace('/(tabs)');
    }
  };

  useEffect(() => {
    if (!isReady) return;

    const timer = setTimeout(() => {
      containerOpacity.value = withTiming(0, { duration: 250 }, () => {
        runOnJS(navigateToNextScreen)();
      });
    }, 1100);

    return () => clearTimeout(timer);
  }, [isReady, isMaintenanceMode, user, profile]);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.background },
        containerAnimatedStyle,
      ]}
    >
      {/* Soft radial-style gradient background */}
      <LinearGradient
        colors={[colors.primaryGlow, 'transparent']}
        style={styles.ambientGradient}
        start={{ x: 0.5, y: 0.3 }}
        end={{ x: 0.5, y: 0.8 }}
      />

      <View style={styles.centerBox}>
        <Animated.View style={[logoAnimatedStyle, shadows.brandGlow(colors.primary)]}>
          <View
            style={[
              styles.logoWrapper,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
          >
            <Image
              source={{ uri: clientConfig.logoUrl }}
              style={styles.logo}
              contentFit="cover"
              transition={200}
            />
          </View>
        </Animated.View>

        <Animated.View style={[styles.textBox, textAnimatedStyle]}>
          <Text style={[typography.display, { color: colors.text, textAlign: 'center' }]}>
            {clientConfig.appName}
          </Text>
          <Text
            style={[
              typography.small,
              { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs },
            ]}
          >
            Learn from the Best Creators
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  ambientGradient: {
    ...StyleSheet.absoluteFill,
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoWrapper: {
    width: 88,
    height: 88,
    borderRadius: 22,
    borderWidth: 1.5,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  textBox: {
    marginTop: 20,
    alignItems: 'center',
  },
});
