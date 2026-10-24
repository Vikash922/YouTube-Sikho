# YOUPI-PG V2 Sovereign Direct UPI Payment Gateway Setup

## 1. Overview
The **YouTube Sikho** ecosystem is powered by **YouPI-PG V2** — an open-source, self-hosted, sovereign payment gateway that processes direct peer-to-peer (P2P) UPI payments directly to your own bank account.

### Why YouPI-PG instead of Razorpay?
- **0% Gateway Commission**: Zero 2-3% aggregator fees on every student transaction.
- **Direct P2P Settlement**: Instant funds transfer to your UPI ID (`youtubesikho@upi`) without 2-3 day holding delays.
- **Sovereign Ownership**: Full database ownership with zero risk of merchant account bans or arbitrary freezes.
- **Deep UPI Intent Support**: Seamless 1-tap checkout via Google Pay, PhonePe, Paytm, BHIM, Cred, and all UPI apps.

---

## 2. Gateway Architecture & Routes

| Service | Local Route | Default Port | Description |
| :--- | :--- | :--- | :--- |
| **Payment Core API** | `http://localhost:6100` | `:6100` | REST API for order sessions, status polling, and observer feeds |
| **Checkout Portal** | `http://localhost:7000` | `:7000` | Customer-facing payment drawer with dynamic QR & UPI deep links |
| **Merchant Admin Hub**| `http://localhost:6001` | `:6001` | Gateway operational dashboard & observer status |
| **Supervisor Center** | `http://localhost:8090` | `:8090` | Process monitor and worker health supervisor |

---

## 3. How to Run the Ecosystem

### Start All Services (Admin Panel + Expo Mobile + YouPI Gateway)
```bash
npm run dev:all
# or
bash scripts/start-all.sh
```

### Start YouPI-PG Gateway Independently
```bash
npm run gateway
# or
cd gateway && YOUPI_ALLOW_LOCALHOST_MODE=true YOUPI_MODE=localhost node scripts/start.js
```

---

## 4. End-to-End Payment Flow

1. **Order Creation (`createOrder` Cloud Function)**:
   - Client requests course enrollment with optional promo coupon.
   - Server validates course price and coupon rules strictly in Firestore.
   - Calls YouPI-PG `POST /api/v1/payments` with order ID and amount in INR.
   - YouPI PG generates a unique `paymentId` and returns `checkoutUrl`.
   - Firestore saves the order under `orders/{orderId}` with `status: 'created'`.

2. **Checkout UI (`app/checkout/[courseId].tsx`)**:
   - Mobile app opens direct UPI intent `upi://pay?pa=...&pn=...&am=...&cu=INR` or launches YouPI checkout modal.
   - Student taps PhonePe / GPay / Paytm or scans dynamic UPI QR code.

3. **Payment Verification (`verifyPayment` Cloud Function)**:
   - Verifies cryptographic signature using HMAC-SHA256 (`YOUPI_WEBHOOK_SECRET`).
   - Atomically updates `orders/{orderId}` to `status: 'paid'`.
   - Provisions student course access in `enrollments/{uid}_{courseId}`.
   - Increments coupon usage count if a coupon was used.

4. **Asynchronous Webhook (`youpiWebhook` Cloud Function)**:
   - Backup worker delivered via `POST /youpiWebhook`.
   - Signed with `X-Gateway-Signature: sha256=<hmac_sha256>`.
   - Idempotently verifies and unlocks course enrollment even if student drops connection before returning to app.

---

## 5. Automated Verification Status
- **Automated Test Suite**: 100% Pass rate (5/5 suites passing).
- **Cloud Functions Suite**: 21/21 tests passing including replay protection and idempotency.
- **Admin Dashboard**: Real-time sales ledger tracking YouPI Payment IDs and 12-digit bank UTR numbers.
