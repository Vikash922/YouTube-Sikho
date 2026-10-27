import React, { useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Stack, useRouter, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { clientConfig, validateClientConfig } from '../src/config/client.config';
import { useTheme } from '../src/theme';
import { ToastContainer } from '../src/components/common/Toast';
import { ConnectionBanner } from '../src/components/common/ConnectionBanner';
import { ErrorBoundary } from '../src/components/common/ErrorBoundary';
import { useConfigStore } from '../src/store/useConfigStore';
import { useAuthStore } from '../src/store/useAuthStore';
import { useNotificationStore } from '../src/store/useNotificationStore';
import { realtimeManager } from '../src/services/realtimeManager';
import { ForceUpdateScreen } from '../src/components/common/ForceUpdateScreen';
import { AnnouncementBanner } from '../src/components/common/AnnouncementBanner';
import { initializePushNotifications, setupNotificationResponseHandler } from '../src/services/pushNotificationService';
import { MotionProvider } from '../src/motion';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
    },
  },
});

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { colors, isDark } = useTheme();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const isMaintenanceMode = useConfigStore((state) => state.isMaintenanceMode);
  const isUpdateRequired = useConfigStore((state) => state.isUpdateRequired);
  const startLiveSync = useConfigStore((state) => state.startLiveSync);

  // 1. Start central realtime config sync & notifications
  useEffect(() => {
    const unsubConfig = startLiveSync();
    const unsubNotif = useNotificationStore.getState().initListener();
    return () => {
      unsubConfig();
      unsubNotif();
    };
  }, [startLiveSync]);

  // 2. Initialize FCM Push Notifications and Response Tap Handler
  useEffect(() => {
    const unsubTapHandler = setupNotificationResponseHandler();
    return () => {
      unsubTapHandler();
    };
  }, []);

  useEffect(() => {
    if (user?.uid) {
      initializePushNotifications(user.uid);
    }
  }, [user?.uid]);

  // 2. Realtime maintenance mode blocker navigation
  useEffect(() => {
    if (isMaintenanceMode && pathname !== '/maintenance') {
      router.replace('/maintenance');
    } else if (!isMaintenanceMode && pathname === '/maintenance') {
      router.replace('/(tabs)');
    }
  }, [isMaintenanceMode, pathname, router]);

  // 3. Realtime student block enforcement
  useEffect(() => {
    if (!user?.uid) return;
    const unsubUser = realtimeManager.watchUserAccount(user.uid, (reason) => {
      Alert.alert(
        'Account Suspended',
        reason || 'Your student account has been suspended by administration.',
        [
          {
            text: 'OK',
            onPress: () => {
              logout();
              router.replace('/(auth)/login');
            },
          },
        ]
      );
    });
    return () => unsubUser();
  }, [user?.uid, logout, router]);

  // 4. Route guard protection for private screens (deep-link preservation)
  useEffect(() => {
    if (!pathname || pathname === '/' || pathname === '/index' || pathname === '/maintenance') {
      return;
    }

    const isPublic =
      pathname === '/login' ||
      pathname === '/otp' ||
      pathname === '/profile-setup' ||
      pathname.startsWith('/(auth)') ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/otp') ||
      pathname.startsWith('/profile-setup') ||
      pathname.startsWith('/legal');

    if (!user && !isPublic) {
      useAuthStore.getState().setPendingRedirectRoute(pathname);
      router.replace('/(auth)/login');
    }
  }, [user, pathname, router]);

  // 0. Runtime validation of client configuration
  useEffect(() => {
    const res = validateClientConfig(clientConfig);
    if (!res.valid && __DEV__) {
      console.error('[ClientConfig Validation Error]:', res.errors.join('\n'));
    }
  }, []);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return <View style={[styles.loading, { backgroundColor: colors.background }]} />;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
        <MotionProvider>
          <SafeAreaProvider>
            <QueryClientProvider client={queryClient}>
              <StatusBar style={isDark ? 'light' : 'dark'} />
              <ConnectionBanner />
              <AnnouncementBanner />
              <ToastContainer />
              {isUpdateRequired ? (
                <ForceUpdateScreen />
              ) : (
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.background },
                    animation: 'slide_from_right',
                  }}
                >
                  <Stack.Screen name="index" />
                  <Stack.Screen name="maintenance" options={{ gestureEnabled: false }} />
                  <Stack.Screen name="(auth)" options={{ gestureEnabled: false }} />
                  <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
                  <Stack.Screen name="course/[id]" />
                  <Stack.Screen name="live/[id]" />
                  <Stack.Screen name="player/[lessonId]" />
                  <Stack.Screen name="checkout/[courseId]" />
                  <Stack.Screen name="notifications" />
                  <Stack.Screen name="support" />
                  <Stack.Screen name="payment/success" options={{ gestureEnabled: false }} />
                  <Stack.Screen name="payment/failed" options={{ gestureEnabled: false }} />
                </Stack>
              )}
            </QueryClientProvider>
          </SafeAreaProvider>
        </MotionProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
  },
});
