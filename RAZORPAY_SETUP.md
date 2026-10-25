# 💳 Razorpay Payment Gateway Integration & Setup Guide

---

## 1. System Architecture & Financial Security Boundary

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
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                    RAZORPAY API                        │
│ • Orders API (amount in paise)                         │
│ • Fetch Payment Check                                  │
│ • Refund Processing API                                │
│ • Webhook Callbacks                                    │
└────────────────────────────────────────────────────────┘
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
```
