# Phase 3: Bunny Stream & Razorpay Architecture & Setup Guide

---

## 1. System Architecture & Security Model

```
                    ┌──────────────────────────────────────────────┐
                    │               CLIENT DEVICES                 │
                    │   Mobile App (Expo)  /  Admin Web (React)   │
                    └──────────────┬───────────────────────────────┘
                                   │
               HTTPS / Signed Requests (Firebase Auth ID Token)
                                   │
                                   ▼
                    ┌──────────────────────────────────────────────┐
                    │           FIREBASE CLOUD FUNCTIONS           │
                    │   (Server-Side Execution & Secret Storage)   │
                    ├──────────────────────────────────────────────┤
                    │ • getVideoToken      • createOrder            │
                    │ • createBunnyUpload  • verifyPayment          │
                    │ • refundPayment      • razorpayWebhook        │
                    └──────────────┬───────────────────────────────┘
                                   │
                   ┌───────────────┴───────────────┐
                   ▼                               ▼
    ┌─────────────────────────────┐ ┌─────────────────────────────┐
    │     BUNNY STREAM API        │ │      RAZORPAY API           │
    │  • Video Library Transcode  │ │  • Order Creation           │
    │  • URL Token Authentication │ │  • HMAC Signature Check     │
    │  • HLS Stream Delivery      │ │  • Webhook Delivery         │
    └─────────────────────────────┘ └─────────────────────────────┘
```

> [!IMPORTANT]
> **Zero-Trust Security Boundary**:
> 1. `BUNNY_API_KEY`, `BUNNY_TOKEN_AUTH_KEY`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` **NEVER** enter client-side bundles (neither mobile app nor `/admin`).
> 2. All video playback URLs are time-limited signed tokens (valid 3600s) generated exclusively on the server after validating student enrollment in Firestore.
> 3. All payment amounts are calculated **ON THE SERVER** from the database course price and coupon collection. Client-submitted prices are discarded.
> 4. Payment unlock is **double-secured**: client-side `verifyPayment` signature check + asynchronous `razorpayWebhook` backup. Both operations are strictly idempotent.

---

## 2. Bunny Stream Video Setup

### A. Create Video Library
1. Log in to [Bunny.net Console](https://dash.bunny.net).
2. From the left sidebar, navigate to **Stream** > **Add Video Library**.
3. Set Library Name: `youtube-sikho-library`.
4. Choose your primary replication region (e.g., `Singapore / India / Frankfurt`).
5. Click **Create Video Library**.

### B. Retrieve Credentials
Within your Video Library dashboard, click **API & Encoding**:
- **Library ID**: Numeric ID (e.g., `384920`). Save as `BUNNY_LIBRARY_ID`.
- **API Key**: Read/Write API key (e.g., `a7c18...`). Save as `BUNNY_API_KEY`.
- **Pull Zone / CDN Hostname**: Under **Delivery**, note the CDN hostname (e.g., `vz-b78912-892.b-cdn.net`). Save as `BUNNY_CDN_HOSTNAME`.

### C. Configure Token Authentication (Anti-Leech DRM)
1. In your Video Library, navigate to **Security** > **URL Token Authentication**.
2. Toggle **Enable Token Authentication** to **ON**.
3. Generate and copy the **Security Key / URL Token Authentication Key**. Save as `BUNNY_TOKEN_AUTH_KEY`.
4. Leave **Token Expiration** handling to the Cloud Function (we dynamically calculate 3600 seconds per token).
5. Toggle **Direct Play URL Access** to **OFF** (forces all playback through tokenized signed requests).

### D. Token Generation Formula (Cloud Function Reference)
Bunny Stream token authorization is calculated using SHA-256 HMAC:
```typescript
import crypto from 'crypto';

export function generateBunnySignedUrl(
  cdnHostname: string,
  videoId: string,
  tokenAuthKey: string,
  expiresInSeconds: number = 3600
): { hlsUrl: string; expiresAt: number } {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const path = `/${videoId}/playlist.m3u8`;
  
  // Hashable string: tokenAuthKey + path + expiresAt
  const hashableBase = `${tokenAuthKey}${path}${expiresAt}`;
  const token = crypto
    .createHash('sha256')
    .update(hashableBase)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const hlsUrl = `https://${cdnHostname}${path}?token=${token}&expires=${expiresAt}`;
  return { hlsUrl, expiresAt };
}
```

---

## 3. Razorpay Payment Gateway Setup

### A. Generate Test API Keys
1. Log in to the [Razorpay Dashboard](https://dashboard.razorpay.com).
2. Switch to **Test Mode** (toggle on top navigation bar).
3. Go to **Settings** > **API Keys** > **Generate Key**.
4. Save the generated keys:
   - `RAZORPAY_KEY_ID`: `rzp_test_...` (Exposed to mobile client for checkout modal)
   - `RAZORPAY_KEY_SECRET`: Secret key (Stored strictly in Firebase Functions Secrets)

### B. Configure Webhook
1. Go to **Settings** > **Webhooks** > **Add New Webhook**.
2. **Webhook URL**:
   `https://<region>-<project-id>.cloudfunctions.net/razorpayWebhook`
   (e.g., `https://us-central1-sikho-77341.cloudfunctions.net/razorpayWebhook`).
3. **Secret**: Enter a strong random secret (e.g., `whsec_yt_sikho_production_99812`). Save as `RAZORPAY_WEBHOOK_SECRET`.
4. **Alert Email**: Enter administrator email.
5. **Active Events**: Select the following checkboxes:
   - `payment.captured` (Primary fulfillment event)
   - `payment.failed` (Updates order status to failed)
   - `refund.processed` (Revokes student enrollment upon refund)
6. Click **Save Webhook**.

### C. Testing in Razorpay TEST Mode
When using `RAZORPAY_KEY_ID: rzp_test_...`:
- **Test Cards**:
  - Number: `4111 1111 1111 1111`
  - Expiry: Any future date (e.g., `12/30`)
  - CVV: `123`
  - OTP: `123456` (Success) or `failure`
- **Test UPI**:
  - Success handle: `success@razorpay`
  - Failure handle: `failure@razorpay`
- **Test Netbanking**: Select any bank -> click **Success** or **Failure** on the simulated bank page.

---

## 4. Complete Package Manifest & EAS Rebuild Matrix

| Package | Purpose | Environment | Requires EAS Rebuild? | Reason & Fallback Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **`expo-video`** | Modern hardware-accelerated HLS video player with audio focus and PiP | Mobile App | **YES** | Native AVPlayer (iOS) and ExoPlayer (Android) bindings. Fallback: Mock player UI in Expo Go with standard controls. |
| **`react-native-razorpay`** | Native Razorpay Android/iOS Checkout SDK wrapper | Mobile App | **YES** | Wraps native Android Razorpay Standard SDK (`com.razorpay.checkout`). Fallback: Web checkout URL / Test simulation. |
| **`expo-screen-capture`** | Screenshot and screen recording blocking (`preventScreenCaptureAsync`) | Mobile App | **YES** (Included in custom dev client) | Requires native Android `FLAG_SECURE` window attribute. Safe fallback on web/emulators. |
| **`lottie-react-native`** | Hardware-accelerated celebration animations on payment success | Mobile App | **YES** (Pre-installed in Expo SDK 51) | Native vector renderer. Fallback: Spring SVG pulse icon. |
| **`firebase-functions`** | Cloud Functions framework (v2 HTTPS & triggers) | Cloud Functions | **No** (Server-side) | Runs on Google Cloud Functions Node 20 runtime. |
| **`firebase-admin`** | Firebase Admin SDK for privileged Firestore, Auth claims, and Transactions | Cloud Functions | **No** (Server-side) | Server-side only with service account permissions. |
| **`razorpay`** | Official Razorpay Node.js SDK for server order creation & refund API | Cloud Functions | **No** (Server-side) | REST API client for server endpoints. |
| **`tus-js-client`** | Resumable chunked video upload client for Bunny Stream | Admin Panel | **No** (Standard browser JS) | Standard browser HTTP Chunked Upload. |

---

## 5. Firebase Functions Secrets Configuration

Set the environment secrets via Firebase CLI:
```bash
firebase functions:secrets:set BUNNY_API_KEY
firebase functions:secrets:set BUNNY_TOKEN_AUTH_KEY
firebase functions:secrets:set BUNNY_LIBRARY_ID
firebase functions:secrets:set BUNNY_CDN_HOSTNAME
firebase functions:secrets:set RAZORPAY_KEY_ID
firebase functions:secrets:set RAZORPAY_KEY_SECRET
firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET
```

For local testing via Firebase Emulator, store them in `functions/.secret.local`:
```env
BUNNY_API_KEY="test_bunny_api_key"
BUNNY_TOKEN_AUTH_KEY="test_bunny_token_auth_key"
BUNNY_LIBRARY_ID="12345"
BUNNY_CDN_HOSTNAME="vz-test-123.b-cdn.net"
RAZORPAY_KEY_ID="rzp_test_SAMPLE123456"
RAZORPAY_KEY_SECRET="SAMPLE_SECRET_KEY_123456"
RAZORPAY_WEBHOOK_SECRET="whsec_SAMPLE_WEBHOOK_123456"
```
