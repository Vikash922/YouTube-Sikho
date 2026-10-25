# 💳 Razorpay & Bunny Stream Integration & Setup Guide

---

## 1. System Architecture & Security Boundary

```
┌────────────────────────────────────────────────────────┐
│                     CLIENT APPS                        │
│   Mobile App (React Native / Expo EAS Dev Build)       │
│   Admin Panel (React / Vite)                           │
└──────────────────────────┬─────────────────────────────┘
                           │
    Callable Functions (Firebase Auth ID Token)
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│            FIREBASE CLOUD FUNCTIONS (asia-south1)      │
│   (Server-Authoritative Execution & Secret Manager)    │
├────────────────────────────────────────────────────────┤
│ • validateCoupon  • createOrder    • verifyPayment     │
│ • refundPayment   • razorpayWebhook                   │
│ • getVideoToken   • createBunnyUpload                  │
└────────────┬───────────────────────────────┬───────────┘
             │                               │
             ▼                               ▼
┌──────────────────────────┐   ┌─────────────────────────┐
│     RAZORPAY API         │   │   BUNNY STREAM API      │
│ • Orders API (amount)    │   │ • Transcoding / Library │
│ • Fetch Payment Check    │   │ • URL Token HMAC DRM    │
│ • Refund Processing API  │   │ • HLS CDN Delivery      │
│ • Webhook Callbacks      │   │                         │
└──────────────────────────┘   └─────────────────────────┘
```

> [!IMPORTANT]
> **Zero-Trust Financial Rules**:
> 1. All order amounts are computed **on the server in integer paise** (`amountPaise`). Client-submitted price amounts are strictly discarded.
> 2. `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` **never** touch client code or bundles.
> 3. Signature verification uses `crypto.timingSafeEqual` with HMAC-SHA256 (`razorpayOrderId|razorpayPaymentId`).
> 4. Order fulfillment & coupon incrementing execute inside an atomic, idempotent Firestore transaction.
> 5. Direct client writes to `orders` and `enrollments` are blocked in `firestore.rules`.

---

## 2. Razorpay Account Setup & KYC

### Step A: Account Registration & KYC
1. Sign up at [https://razorpay.com](https://razorpay.com).
2. Complete business KYC (Bank Account, PAN, GST if applicable, business registration documents).
3. Once KYC is submitted, your account has access to **Test Mode** immediately, and **Live Mode** upon approval.

### Step B: Generate API Keys
1. In the [Razorpay Dashboard](https://dashboard.razorpay.com), use the top header to toggle between **Test Mode** and **Live Mode**.
2. Navigate to **Account & Settings** > **API Keys** (under *Website and app settings*).
3. Click **Generate Key**.
4. Securely note down:
   - `Key ID` (e.g. `rzp_test_...` or `rzp_live_...`)
   - `Key Secret` (32+ alphanumeric characters)

### Step C: Configure Webhook
1. In the Razorpay Dashboard, navigate to **Account & Settings** > **Webhooks**.
2. Click **+ Add New Webhook**.
3. **Webhook URL**:
   `https://asia-south1-<your-project-id>.cloudfunctions.net/razorpayWebhook`
   *(Replace `<your-project-id>` with your Firebase Project ID, e.g. `sikho-77341`).*
4. **Secret**: Enter a strong random secret string (e.g. `whsec_yt_sikho_production_99812`).
5. **Alert Email**: Enter your operations/support email address.
6. **Active Events**: Check the following three events:
   - `payment.captured` — Triggered when student payment succeeds (fallback fulfillment)
   - `payment.failed` — Triggered when transaction fails (updates order status)
   - `refund.processed` — Triggered when Razorpay processes an admin refund (revokes enrollment)
7. Click **Create Webhook**.

---

## 3. Configure Cloud Secrets in Firebase

Set the secrets in Google Cloud Secret Manager using the Firebase CLI:

```bash
# 1. Razorpay Key ID
firebase functions:secrets:set RAZORPAY_KEY_ID

# 2. Razorpay Key Secret
firebase functions:secrets:set RAZORPAY_KEY_SECRET

# 3. Razorpay Webhook Secret
firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET

# 4. Bunny Stream API Keys
firebase functions:secrets:set BUNNY_API_KEY
firebase functions:secrets:set BUNNY_TOKEN_AUTH_KEY
firebase functions:secrets:set BUNNY_LIBRARY_ID
firebase functions:secrets:set BUNNY_CDN_HOSTNAME
```

### Local Testing with Emulator
For local testing via the Firebase Emulator Suite, create `functions/.secret.local`:
```env
RAZORPAY_KEY_ID=rzp_test_YourTestKeyHere
RAZORPAY_KEY_SECRET=YourTestSecretHere
RAZORPAY_WEBHOOK_SECRET=whsec_YourWebhookSecretHere
BUNNY_API_KEY=test_bunny_key
BUNNY_TOKEN_AUTH_KEY=test_token_key
BUNNY_LIBRARY_ID=123456
BUNNY_CDN_HOSTNAME=video.youtubesikho.com
```

---

## 4. How to Test Payments in Razorpay TEST Mode

When using `RAZORPAY_KEY_ID: rzp_test_...`:

### A. Test Cards
- **Card Number**: `4111 1111 1111 1111`
- **Expiry**: Any future date (e.g., `12/30`)
- **CVV**: `123`
- **Name**: Any name
- **OTP**: `123456` (click **Success**) or click **Failure** to test rejection.

### B. Test UPI
- **Success VPA**: `success@razorpay`
- **Failure VPA**: `failure@razorpay`

### C. Test Net Banking
- Select any listed bank (e.g., HDFC, ICICI, SBI).
- On the simulated bank page, click **Success** or **Failure**.

---

## 5. How to Test the Webhook Locally

You can test the webhook handler locally using the Firebase CLI and curl / ngrok:

### Method 1: Local Emulator via curl
```bash
# Generate HMAC signature
BODY='{"id":"evt_test_123","event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_test_999","order_id":"order_YOUR_ORDER_ID","amount":49900,"currency":"INR","status":"captured"}}}}'
SECRET="whsec_YourWebhookSecretHere"
SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')

# Send webhook request
curl -X POST http://127.0.0.1:5001/<project-id>/asia-south1/razorpayWebhook \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: $SIG" \
  -d "$BODY"
```

### Method 2: Public Tunnel with ngrok
```bash
# 1. Start tunnel to your local functions emulator
ngrok http 5001

# 2. Add temporary ngrok webhook URL in Razorpay Dashboard Test Mode:
# https://xxxx.ngrok-free.app/<project-id>/asia-south1/razorpayWebhook
```

---

## 6. Google Play Store Policy Notice (Digital Goods & Payments)

> [!WARNING]
> **Google Play Billing vs Third-Party Payment Gateways**:
> - Under Google Play's Payments Policy, digital content and services consumed primarily inside the mobile app (such as pre-recorded courses, in-app digital items, and digital subscriptions) in many regions typically fall under Google Play's billing requirements unless your app qualifies for an exception (such as in India under User Choice Billing / Alternative Billing, or if courses qualify as teacher-led live tuition/education services).
> - **Action Required**: Verify the current Google Play Developer Policy for your registered country and business category before submitting the production APK/AAB to the Play Store. Ensure you have enabled Alternative Billing / User Choice Billing in Google Play Console if offering third-party gateways like Razorpay in India.

---

## 7. Package Manifest & Build Matrix

| Package | Purpose | Layer | Requires EAS Rebuild? |
| :--- | :--- | :--- | :--- |
| **`react-native-razorpay`** | Native Android/iOS Checkout SDK (`com.razorpay.checkout`) | Mobile App | **YES** (`eas build --profile development`) |
| **`razorpay`** | Server-side Razorpay Node.js SDK for Order creation & Refunds | Cloud Functions | **No** (Server deploy) |
| **`firebase-functions`** | v2 callable and HTTPS webhook endpoints | Cloud Functions | **No** (Server deploy) |
| **`firebase-admin`** | Privileged database writes and transactions | Cloud Functions | **No** (Server deploy) |
