import { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';

/**
 * useScreenProtection Hook
 * 
 * - Calls preventScreenCaptureAsync() on mount (activates Android FLAG_SECURE to block screenshots and recording).
 * - Calls allowScreenCaptureAsync() on unmount.
 * - On iOS, registers addScreenshotListener() to detect screenshot events and briefly blur/cover content.
 * 
 * NOTE: Full hardware screenshot blocking via Android FLAG_SECURE functions in standalone development
 * and production builds (EAS Build / APK / AAB). In standard Expo Go, native screen capture prevention
 * may be unavailable or limited; the hook handles missing native methods gracefully without crashing.
 */
export function useScreenProtection(key: string = 'default') {
  const [isScreenCaptured, setIsScreenCaptured] = useState(false);

  useEffect(() => {
    let sub: ScreenCapture.Subscription | null = null;
    let timer: any = null;

    async function activateProtection() {
      // 1. Prevent screen capture (Android FLAG_SECURE)
      try {
        if (typeof ScreenCapture.preventScreenCaptureAsync === 'function') {
          await ScreenCapture.preventScreenCaptureAsync(key);
        }
      } catch (err) {
        // Safe fallback when native module is missing (e.g. Expo Go sandbox)
        console.info('[useScreenProtection] Native screen capture prevention unavailable in current environment.');
      }

      // 2. iOS screenshot detection listener
      try {
        if (typeof ScreenCapture.addScreenshotListener === 'function') {
          sub = ScreenCapture.addScreenshotListener(() => {
            setIsScreenCaptured(true);
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
              setIsScreenCaptured(false);
            }, 3500);
          });
        }
      } catch {
        // Safe fallback if screenshot listener is unsupported
      }
    }

    activateProtection();

    return () => {
      if (timer) clearTimeout(timer);
      try {
        if (typeof ScreenCapture.allowScreenCaptureAsync === 'function') {
          ScreenCapture.allowScreenCaptureAsync(key).catch(() => {});
        }
      } catch {
        // Safe fallback on unmount
      }
      if (sub && typeof sub.remove === 'function') {
        sub.remove();
      }
    };
  }, [key]);

  return { isScreenCaptured };
}
