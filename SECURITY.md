# System Security Architecture & Threat Model

This document provides a rigorous, verified analysis of the security posture, threat model, implemented controls, residual risks, and incident response procedures across the course platform ecosystem (Expo Mobile App, Vite Admin Console, Firebase Backend, Cloud Functions in `asia-south1`, and Storage/R2).

---

## 1. Threat Model & Trust Boundaries

The system processes financial payments, personal student data (PII), and copyrighted course curriculum across four distinct security zones:

```
[ Untrusted Zone ]                [ DMZ / Cloud Boundary ]             [ Trusted Core Zone ]
─────────────────────────────────────────────────────────────────────────────────────────────
Mobile App (Android/iOS)  ──▶  Firebase App Check (Play Integrity)  ──▶  Cloud Functions v2 (Node 20)
Web Admin Console (Browser) ──▶  Firebase App Check (reCAPTCHA v3)   ──▶  Firestore Rules (v2 RBAC)
Razorpay Webhook Callback ──▶  HMAC-SHA256 Timing-Safe Guard       ──▶  GCP Secret Manager
Cloudflare R2 Direct      ──▶  SigV4 Presigned Short-Lived URL     ──▶  Cloud Storage Private Buckets
```

### Trust Boundary Invariants:
1. **Client is Untrusted**: No client-supplied values for prices, discounts, enrollment states, user roles, or quiz evaluation are accepted.
2. **Server-Side Computation**: All pricing, coupon validation, order creation, enrollment activation, and quiz grading execute exclusively within Cloud Functions.
3. **Database Guardrails**: Direct client writes to `orders`, `enrollments`, `courses/*/private`, and `admins` are permanently prohibited by Firestore security rules.
4. **Zero Shared Secrets**: API secrets (Razorpay Secret, Webhook Secret, R2 Access Keys) are loaded at runtime from Google Cloud Secret Manager; they never reside in client code, bundle builds, or git repositories.

---

## 2. Implemented Defense-in-Depth Controls

### A. Role-Based Access Control (RBAC)
- Authority is derived from Firebase Auth Custom Claims (`admin === true`, `role === 'owner' | 'editor' | 'support'`) verified against Firestore `/admins/{uid}` records.
- Rules enforce strict role tiers:
  - `owner`: Manage administrators, platform settings, refunds, and financial reporting.
  - `editor`: Create and modify courses, curriculum, quizzes, and live classes.
  - `support`: Read student profiles, inspect order statuses, and reply to support tickets.
- Token revocation is instantaneous: whenever custom claims change, client sessions re-verify via `onIdTokenChanged`.

### B. Order & Payment Invariants
- **Server Price Authority**: `createOrder` retrieves the base course price directly from Firestore, validates applicable coupons with active date and usage limits, and calculates the final charge server-side.
- **Timing-Safe HMAC Verification**: `verifyPayment` and `razorpayWebhook` evaluate digital signatures using `crypto.timingSafeEqual` over SHA-256 digests to prevent timing attacks.
- **Transactional Idempotency**: Payment handlers utilize Firestore `runTransaction` to atomically transition order status from `pending` to `paid` and create the student enrollment in a single round-trip, preventing double-fulfillment on duplicate webhook deliveries.

### C. Anti-Cheat & Asset Protection
- **Quarantined Question Banks**: Quiz question answers (`correctOptionIndex`) are stored in `/quizzes/{quizId}/questions` and restricted to admin reads. The `getQuizQuestions` function strips answers before serving questions to students.
- **Grace-Period Enforcement**: `submitQuiz` enforces a 60-second network latency buffer on top of quiz duration; expired attempts are rejected.
- **Zero-Egress Study Material URLs**: PDFs and downloadable attachments utilize ephemeral (15-minute) AWS SigV4 presigned URLs from Cloudflare R2 generated only after enrollment validation.

### D. App Check & Network Hardening
- **Firebase App Check**:
  - Android: Google Play Integrity API attests genuine app authenticity.
  - Web Admin: Google reCAPTCHA v3 validates browser traffic.
  - Callables: Enforces `enforceAppCheck: true` with one-time replay token consumption (`consumeAppCheckToken: true`) on sensitive endpoints (`createOrder`, `verifyPayment`, `deleteAccount`).
- **Web Security Headers**: Admin hosting enforces strict Content-Security-Policy (CSP), `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, and `HSTS`.
- **Source Maps & Debugger Stripping**: Production admin builds disable source maps and drop `console.*` and `debugger` calls via Vite/esbuild.

---

## 3. Residual Risks & Honest Limitations

1. **Unlisted Video Extraction**:
   - Course videos hosted as Unlisted YouTube videos are quarantined on the server until playback. However, once the video ID is supplied to the client video player, a technically sophisticated user with network proxy tools (mitmproxy, Charles) could capture the YouTube URL and play it in a browser.
   - *Mitigation*: Session heartbeats, device session limits (max 2), client screen-recording blocks, and one-click video replacement in the admin console.
2. **Physical Recording**:
   - While `expo-screen-capture` prevents software screenshots and screen recording on Android and detects recording on iOS, it cannot prevent physical camera recording of the device screen.
3. **Rooted / Jailbroken Android Devices**:
   - Rooted devices running Frida or Xposed can potentially bypass client-side checks. Firebase App Check Play Integrity significantly raises the bar by rejecting rooted device integrity tokens.

---

## 4. Incident Response & Disaster Recovery

### Emergency Credential Rotation Procedure
If an API key or service account is compromised:
1. **Razorpay Key Rotation**:
   - Generate new Key & Secret in Razorpay Dashboard -> Settings -> API Keys.
   - Update Cloud Secret Manager:
     ```bash
     firebase functions:secrets:set RAZORPAY_KEY_ID
     firebase functions:secrets:set RAZORPAY_KEY_SECRET
     ```
   - Redeploy functions: `npm --prefix functions run deploy`.
2. **Revoking Compromised Administrator**:
   - Run `node scripts/set-first-admin.js --revoke --email <compromised-admin-email>`.
   - In Firebase Console -> Authentication -> Users, immediately disable the user account.
3. **Disaster Recovery Backup Restoration**:
   - Run daily backups: `npm run backup:firestore`.
   - In disaster recovery scenarios, parse the timestamped `.json.gz` archive from `./backups/` and restore documents via the Admin SDK batch writer.

---

## 5. Git History Secrets Purge & Rotation Plan

In Step 10.1, historical commits were audited for sensitive artifacts (e.g. historical debug keystores or legacy sample keys). The working tree has been hardened with:
- `.gitignore` blocking `*.keystore`, `*.jks`, `*.pem`, `.env*`, and `serviceAccount*`.
- Automated pre-commit hook (`scripts/pre-commit-secret-scan.js`).

### Recommended Repository History Purge (Optional One-Time Action):
To permanently expunge old commits from git history before making a repository public:
```bash
# 1. Install git-filter-repo
pip install git-filter-repo

# 2. Run history rewrite (WARNING: rewrites commit SHAs, requires force-push)
git filter-repo --invert-paths --path android/app/debug.keystore

# 3. Force push rewritten clean history
git push origin --force --all
```

### Rotation Checklist (External Developer Actions):
- **Razorpay**: Rotate Test/Live API keys and Webhook secret in Razorpay Dashboard.
- **Firebase API Keys**: Restrict Web API Key in Google Cloud Console -> APIs & Services -> Credentials to package name `com.youtubesikho.academy` and SHA-256 fingerprint.
- **Admin Password**: Enforce password rotation and MFA for all administrator emails.
