import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { firebaseAuth, firebaseFirestore, doc, updateDoc } from './firebase';

/**
 * PUSH NOTIFICATION & REAL FCM SERVICE
 * -------------------------------------------------------------
 * Guided by ARCHITECTURE.md:
 * - Real FCM push notifications require an EAS Development Build or Production APK.
 * - In Expo Go, FCM is cleanly disabled with an informative log line (zero dummy tokens written).
 */

const isExpoGo = Constants.appOwnership === 'expo';

export async function initializePushNotifications(uid: string): Promise<string | null> {
  if (!uid) return null;

  if (isExpoGo) {
    console.log(
      '[Push Notification] Running inside Expo Go: native FCM push notifications are disabled. EAS Development Build is required for real device FCM.'
    );
    return null;
  }

  try {
    // Dynamically require native notification modules to prevent crash in Expo Go
    const Notifications = require('expo-notifications');

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push Notification] Notification permission not granted by user.');
      return null;
    }

    // Retrieve real device push token (FCM on Android / APNs on iOS)
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const token = tokenData.data;

    if (token) {
      const userRef = doc(firebaseFirestore, 'users', uid);
      await updateDoc(userRef, {
        fcmToken: token,
        fcmTokenUpdatedAt: new Date().toISOString(),
      });
      console.log('[Push Notification] Real device FCM token registered successfully.');
    }

    // Configure foreground notification presentation handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    return token;
  } catch (err: any) {
    console.warn('[Push Notification] Failed to initialize FCM notifications:', err.message);
    return null;
  }
}

/**
 * Remove FCM token from Firestore upon user sign out
 */
export async function removePushTokenOnLogout(uid: string): Promise<void> {
  if (!uid || isExpoGo) return;

  try {
    const userRef = doc(firebaseFirestore, 'users', uid);
    await updateDoc(userRef, {
      fcmToken: '',
      fcmTokenUpdatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.warn('[Push Notification] Could not remove FCM token on logout:', err.message);
  }
}

/**
 * Handle user tapping a notification (foreground, background, or killed state)
 */
export function setupNotificationResponseHandler(): () => void {
  if (isExpoGo) return () => {};

  try {
    const Notifications = require('expo-notifications');

    // 1. Handle notification opened while app was backgrounded/foregrounded
    const subscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
      handleNotificationTap(response?.notification?.request?.content?.data);
    });

    // 2. Handle cold start / killed state tap
    Notifications.getLastNotificationResponseAsync().then((response: any) => {
      if (response) {
        handleNotificationTap(response?.notification?.request?.content?.data);
      }
    });

    return () => {
      subscription.remove();
    };
  } catch (err: any) {
    console.warn('[Push Notification] Response listener error:', err.message);
    return () => {};
  }
}

function handleNotificationTap(data: any) {
  if (!data) return;

  const { actionType, actionData, courseId, classId } = data;

  if (actionType === 'course' && (actionData || courseId)) {
    router.push(`/course/${actionData || courseId}`);
  } else if (actionType === 'live' && (actionData || classId)) {
    router.push(`/live/${actionData || classId}`);
  } else if (actionType === 'notifications') {
    router.push('/notifications');
  } else {
    router.push('/notifications');
  }
}
