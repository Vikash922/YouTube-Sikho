import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
import { RefreshCw, AlertCircle } from 'lucide-react-native';
import { useAppInit } from '../src/hooks/useAppInit';
import { useAuthStore } from '../src/store/useAuthStore';
import { useTheme } from '../src/theme';
import { clientConfig } from '../src/config/client.config';

export default function SplashScreen() {
  const router = useRouter();
  const { colors, typography, shadows, spacing, radius } = useTheme();
  const { isReady, isMaintenanceMode, configError, isOffline, retry } = useAppInit();
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
    } else if (profile?.isBlocked) {
      useAuthStore.getState().logout();
      router.replace('/(auth)/login');
    } else if (isOffline) {
      // Offline mode: proceed to home so existing students aren't forced into profile-setup
      router.replace('/(tabs)');
    } else if (!profile || !profile.name) {
      router.replace('/(auth)/profile-setup');
    } else {
      const pending = useAuthStore.getState().pendingRedirectRoute;
      if (pending) {
        useAuthStore.getState().setPendingRedirectRoute(null);
        router.replace(pending as any);
      } else {
        router.replace('/(tabs)');
      }
    }
  };

  useEffect(() => {
    if (!isReady || configError) return;

    const timer = setTimeout(() => {
      containerOpacity.value = withTiming(0, { duration: 250 }, () => {
        runOnJS(navigateToNextScreen)();
      });
    }, 1100);

    return () => clearTimeout(timer);
  }, [isReady, configError, isMaintenanceMode, user, profile, isOffline]);

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

        {configError && (
          <View
            style={[
              styles.errorCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.error,
                borderRadius: radius.card,
              },
            ]}
          >
            <AlertCircle size={20} color={colors.error} />
            <Text style={[typography.body, { color: colors.text, textAlign: 'center', marginVertical: 8 }]}>
              {configError}
            </Text>
            <TouchableOpacity
              onPress={retry}
              activeOpacity={0.8}
              style={[styles.retryBtn, { backgroundColor: colors.primary, borderRadius: radius.button }]}
            >
              <RefreshCw size={16} color={colors.textInverse} style={{ marginRight: 8 }} />
              <Text style={[typography.body, { color: colors.textInverse, fontWeight: '600' }]}>Retry Connection</Text>
            </TouchableOpacity>
          </View>
        )}
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
    width: '100%',
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
  errorCard: {
    marginTop: 28,
    padding: 16,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    alignItems: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginTop: 8,
  },
});
