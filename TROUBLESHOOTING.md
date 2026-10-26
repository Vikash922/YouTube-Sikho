# 🛠 Production Troubleshooting & Diagnostic Guide

The top 10 production issues that may arise, root causes, and step-by-step resolution steps.

---

### 1. Video Fails to Play in Mobile Player
- **Symptoms**: Video player shows a loading spinner continuously or displays "Playback Error".
- **Root Cause**:
  1. The playback session has expired or the student account was logged in on too many active devices.
  2. The unlisted YouTube video has embedding disabled in YouTube Studio or was marked Private.
- **Fix**:
  1. Have student back out and re-tap the lesson; `getLessonPlayback` generates a fresh active session.
  2. Verify in YouTube Studio that the video visibility is set to **Unlisted** and **Allow embedding** is checked.

---

### 2. Payment Succeeded but Course Did Not Unlock
- **Symptoms**: Student money was debited via UPI, but the course still shows "Buy Now".
- **Root Cause**: The student closed the app before the client could send the verification payload, or the mobile internet dropped during the callback.
- **Fix**:
  1. Check **Orders** in Admin. The asynchronous Razorpay Webhook (`razorpayWebhook`) automatically catches debited payments and unlocks the course within 60 seconds.
  2. If webhook failed due to invalid webhook secret, go to **Students** $\rightarrow$ Search student $\rightarrow$ Click **Grant Access** to unlock manually in 1 second.
  3. Verify `RAZORPAY_WEBHOOK_SECRET` in Firebase Cloud Functions secrets.

---

### 3. Push Notifications Not Arriving on Mobile
- **Symptoms**: Admin sends notification broadcast, but students report no notifications on their phones.
- **Root Cause**:
  1. Student device denied notification permission in Android 13+ system settings.
  2. Student device battery optimization killed background sync.
- **Fix**:
  1. The app automatically displays an in-app permission banner explaining the value of live class alerts.
  2. In Admin, verify the notification was created in `/notifications`. All notifications also appear in the student's in-app **Notification Center** tab (`/notifications`) regardless of system notification delivery.

---

### 4. Admin Panel Shows "Missing or Insufficient Permissions"
- **Symptoms**: Admin logs in, but tables display "Permission Denied".
- **Root Cause**: The administrator's Firebase Auth account does not have the custom claim `admin: true` set, or their UID is missing from `/admins/{uid}` in Firestore.
- **Fix**:
  1. Run the admin provisioning command in terminal:
     ```bash
     node scripts/set-first-admin.js --service-account serviceAccountKey.json --email <admin-email>
     ```
  2. In the Admin Web Portal, click **Sign Out** and log back in to refresh the Firebase Auth JWT token with the new admin claims.

---

### 5. Google Play Rejects App Review
- **Common Rejection Reasons & Solutions**:
  1. *Reviewer cannot log in*: Reviewer is located outside India and cannot receive SMS OTP.
     - **Solution**: In Play Console **App Content** $\rightarrow$ **App Access**, provide test credentials: Phone `+91 99999 88888`, OTP `123456`.
  2. *Target SDK too low*: Must target API 34+ (Android 14).
     - **Solution**: Confirmed `targetSdkVersion: 34` in [`app.config.ts`](app.config.ts).
  3. *Missing Account Deletion Link*:
     - **Solution**: Verified present both in-app ([`app/settings/index.tsx`](app/settings/index.tsx)) and web link `https://youtubesikho.com/delete-account`.

---

### 6. YouTube Live Stream Won't Start
- **Symptoms**: Student player displays "Video unavailable" or "Playback restricted".
- **Root Cause**: The YouTube stream privacy is set to **Private** instead of **Unlisted** or **Public**, or embedding is disabled in YouTube Studio.
- **Fix**:
  1. In YouTube Studio, verify stream visibility is **Unlisted** (not Private).
  2. In Advanced Settings, check the box: **Allow Embedding**.

---

### 7. High Firestore Read Billing
- **Symptoms**: Unexpected spike in Firestore read counts.
- **Root Cause**: `onSnapshot` listeners created inside screen components without returning an `unsubscribe` cleanup function, resulting in duplicate listeners every time a user switches tabs.
- **Fix**:
  1. All listeners in this codebase are wrapped in `useEffect(() => { const unsub = ...; return () => unsub(); }, [])`.
  2. Centralized in [`src/services/realtimeManager.ts`](src/services/realtimeManager.ts) and shared across tabs.
  3. Firestore offline persistence is enabled with LRU cache eviction, serving repeat views from local disk storage.

---

### 8. EAS Build Fails with Package Mismatches
- **Symptoms**: `eas build --platform android` fails during Gradle build.
- **Root Cause**: Outdated CLI or mismatched dependencies.
- **Fix**:
  1. Run `npx expo-doctor` in project root to verify all Expo SDK 51 package alignments.
  2. Run `npx eas-cli build --platform android --clear-cache` to force a clean build cache.

---

### 9. Student Complains About Audio or Subtitles
- **Symptoms**: Video plays video track but audio is muted, or subtitles overlap.
- **Root Cause**: Device silent switch active or low volume setting.
- **Fix**:
  1. In Expo Audio configuration, `playsInSilentModeIOS: true` is configured in player.
  2. Player UI includes an explicit on-screen mute/unmute icon and speed controller (1.0x, 1.25x, 1.5x, 2.0x).

---

### 10. Razorpay Webhook Signature Verification Failure
- **Symptoms**: Cloud Function logs: `Invalid webhook signature`.
- **Root Cause**: Secret mismatch between Razorpay Dashboard and `RAZORPAY_WEBHOOK_SECRET` in Cloud Functions.
- **Fix**:
  1. Open Razorpay Dashboard $\rightarrow$ **Settings** $\rightarrow$ **Webhooks**.
  2. Copy the exact Secret string configured for the webhook endpoint.
  3. Update `functions/.env` with `RAZORPAY_WEBHOOK_SECRET="<secret>"` and redeploy functions.

---

### 11. Account Deletion Fails with "Recent login required"
- **Symptoms**: Student taps "Delete My Account" and gets "Re-Authentication Required".
- **Root Cause**: Firebase Auth security requirement — sensitive actions like account deletion require the user's `auth_time` to be within the last 5 minutes (300 seconds).
- **Fix**:
  1. Prompt user to log out and log back in.
  2. Upon fresh login, retry deleting the account immediately.
  3. For users unable to log in, direct them to `https://sikho-77341.web.app/delete-account` to submit a web deletion request.

---

### 12. Dead FCM Push Tokens & Multicast Failures
- **Symptoms**: Notification history shows some FCM failure count.
- **Root Cause**: User uninstalled the app or cleared app storage, invalidating the FCM registration token.
- **Fix**:
  1. `sendNotification` Cloud Function automatically catches `messaging/registration-token-not-registered` and unsets the user's `fcmToken`.
  2. When the user logs back in on the mobile app, the fresh push token is automatically registered.

---

### 13. Cloud Functions Deploy Fails with "Must be on Blaze plan"
- **Symptoms**: `firebase deploy --only functions` exits with code 1 and URL pointing to Blaze upgrade.
- **Root Cause**: Google Cloud Functions v2 and Cloud Build container generation require an active billing account (Blaze Pay-as-you-go).
- **Fix**:
  1. Upgrade to Firebase Blaze in [Firebase Console Usage & Billing](https://console.firebase.google.com/project/sikho-77341/usage/details).
  2. Note: Blaze includes the exact same Free Tier as Spark (2 Million function calls/month free, 5GB storage free).
  3. Set a ₹1 or $1 budget alert in Google Cloud Console to ensure ₹0 charges.
  4. Once enabled, deploy via `firebase deploy --only functions`.
