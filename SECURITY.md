# Security Architecture & Hardening Guide

## Overview & Threat Model
This document details the security posture, threat mitigation strategies, and configuration guidelines for the **YouTube Sikho Academy** multi-tenant course-selling ecosystem (Expo React Native Client, Vite React Admin Panel, Firebase Backend, Cloud Functions, and Bunny Stream).

---

## 1. Vulnerability Remediations & Rule Verification

### A. Privilege Escalation Eradication (Firestore Rules)
- **Previous Risk**: Overly broad regex check `request.auth.token.email.matches('.*admin.*')` permitted any user with an email containing the word "admin" (e.g. `badadmin@attacker.com`) to claim full administrative read/write privileges.
- **Hardening**:
  - Replaced with strict token verification:
    ```javascript
    function isAdmin() {
      return isAuthenticated() && (
        request.auth.token.admin == true ||
        request.auth.token.role == 'admin' ||
        request.auth.token.email == 'admin@youtubesikho.com'
      );
    }
    ```
  - Protected the `/admins` collection so only validated admins can read or write admin documents.

### B. Student Direct Order & Enrollment Forgery Prevention
- **Previous Risk**: Direct write access to `orders` and `enrollments` allowed malicious actors to craft paid orders or grant free course access by writing directly to Firestore.
- **Hardening**:
  - `orders` and `enrollments` documents are locked against student writes (`allow write: if isAdmin()`).
  - Enrollments and orders are generated and updated **exclusively by backend Cloud Functions** (`createOrder`, `verifyPayment`, and `razorpayWebhook`).

### C. Live Class Chat Flooding & Impersonation Defense
- **Previous Risk**: Unbounded chat message size and lack of UID verification allowed spam flooding and sender impersonation.
- **Hardening**:
  - Chat messages require `request.auth.uid == request.resource.data.uid`.
  - Content length is enforced server-side: `request.resource.data.text is string && request.resource.data.text.size() <= 300`.

### D. Anti-Cheat Quiz Architecture
- **Previous Risk**: Storing questions and correct option indices in client-readable Firestore collections exposed answers via network inspection.
- **Hardening**:
  - Subcollection `/quizzes/{quizId}/questions` denies read access to students (`allow read: if isAdmin()`).
  - Student submissions are processed by the `submitQuiz` Cloud Function, which retrieves the master question bank internally, calculates marks and negative marking penalties, and writes the verified result.

### E. Storage Bucket Restrictions (`storage.rules`)
- Strict MIME-type validation prevents uploading malicious executables or scripts:
  - User Avatars: `image/(jpeg|png|webp|gif)` with max size `< 10 MB`.
  - Course Media & Banners: Restricted to admin write, `image/*` `< 10 MB`.
  - Study Material PDFs: Restricted to admin write, `application/pdf` `< 25 MB`.
  - Default Deny rule on all other paths.

---

## 2. Server-Authoritative Commerce & Bunny Stream Protection

### A. Idempotent Cryptographic Payment Verification
- `verifyPayment` and `razorpayWebhook` verify Razorpay cryptographic HMAC-SHA256 signatures:
  ```typescript
  const expectedSignature = crypto
    .createHmac('sha256', razorpayKeySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');
  ```
- **Replay Idempotency**: Order updates and enrollment creations use Firestore transactions to guarantee that duplicate webhook events or repeated client verification calls result in exactly **one** enrollment document.

### B. Time-Limited Signed Bunny Stream Tokens
- Direct video URLs are never exposed to clients.
- The `getVideoToken` Cloud Function verifies the student's active enrollment before generating an SHA-256 HMAC token with an expiration timestamp (`expires = now + 3600` seconds).

---

## 3. Web & Admin Security Headers (`firebase.json`)

Firebase Hosting serves the admin dashboard with strict SaaS security headers:
- `X-Frame-Options: SAMEORIGIN` (prevents clickjacking)
- `X-Content-Type-Options: nosniff` (mitigates MIME-type confusion attacks)
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (enforces HTTPS)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(self), microphone=(self), display-capture=(self)`

---

## 4. Production Checklist & Secret Management

| Item | Status | Action Required in Firebase / Cloud Console |
| :--- | :---: | :--- |
| **API Key Scoping** | Pending Console Setup | In Google Cloud Console, restrict the Firebase Web API key to `https://sikho-77341.firebaseapp.com` and Android package `com.youtubesikho.app`. |
| **Firebase App Check** | Ready for Enablement | Enable Firebase App Check with Play Integrity (Android) and reCAPTCHA Enterprise (Admin Web) to prevent bot scraping. |
| **Razorpay Webhooks** | Configured in Code | In Razorpay Dashboard, set the Webhook URL to `https://us-central1-sikho-77341.cloudfunctions.net/razorpayWebhook` with secret matching `RAZORPAY_WEBHOOK_SECRET`. |
| **Environment Decoupling** | Completed | All secrets (`.env*`) are gitignored; client fallbacks are sanitized without plaintext secret credentials. |
