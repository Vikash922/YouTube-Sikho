# Security Architecture & Hardening Guide

## Overview & Threat Model
This document details the security posture, threat mitigation strategies, and verified enforcement mechanisms for the **YouTube Sikho Academy** multi-tenant course-selling platform (Expo React Native Client, Vite React Admin Panel, Firebase Backend, Cloud Functions in `asia-south1`, and Bunny Stream).

---

## 1. Vulnerability Remediations & Rule Verification

### A. Admin Privilege Lockdown (Custom Claims Only)
- **Previous Risk**: Hardcoded passwords (`Admin@123456`), "Instant Admin Demo Access" button, and email regex comparisons (`matches('.*admin.*')`) allowed arbitrary account takeover.
- **Current Enforcement**:
  - The ONLY source of administrative authority is the Firebase Auth Custom Claim `{ admin: true }`.
  - In `firestore.rules` and `storage.rules`:
    ```javascript
    function isAdmin() {
      return request.auth != null && request.auth.token.admin == true;
    }
    ```
  - Hardcoded credentials and demo buttons have been completely removed from `admin/src/context/AuthContext.tsx` and `admin/src/pages/Login.tsx`.
  - Admin promotion is performed exclusively via the backend Admin SDK script:
    `node scripts/set-first-admin.js --service-account <path-to-key.json> --email <user-email>`

### B. Student Order & Enrollment Forgery Prevention
- **Previous Risk**: Direct write access to `orders` and `enrollments` allowed malicious actors to craft paid orders or grant free course access by writing directly to Firestore.
- **Current Enforcement**:
  - `orders` and `enrollments` documents are locked against direct client writes (`allow write: if false;` for regular users).
  - All orders are calculated and created server-side via `createOrder`.
  - Enrollments are created strictly after HMAC-SHA256 signature verification via `verifyPayment` or `razorpayWebhook` using `crypto.timingSafeEqual`.

### C. Video Asset Quarantine & Signed DRM Playback
- **Previous Risk**: Public lesson documents previously contained direct YouTube/video URLs, allowing unauthorized video playback.
- **Current Enforcement**:
  - Video GUIDs are quarantined in a private subcollection:
    `/courses/{courseId}/sections/{sectionId}/lessons/{lessonId}/private/media`
  - Students cannot read this subcollection directly.
  - The `getVideoToken` Cloud Function verifies active enrollment and generates a time-limited signed `.m3u8` token URL.
  - Screen capture is blocked on Android and detected on iOS.

### D. Anti-Cheat Quiz Protection
- **Previous Risk**: Storing questions and correct option indices in client-readable Firestore collections exposed answers via network inspection.
- **Current Enforcement**:
  - Subcollection `/quizzes/{quizId}/questions` denies direct client read access (`allow read: if isAdmin();`).
  - Questions (without correct answers) are retrieved via the authenticated `getQuizQuestions` Cloud Function.
  - Submissions are evaluated server-side via `submitQuiz` with negative marking, time-limit grace period checks, and retries protection.

### E. Play Store Compliant User Data Deletion
- In accordance with Google Play Store User Data policy, the `deleteAccount` Cloud Function purges user documents, progress, notifications, reviews, tickets, quiz attempts, and storage assets in chunks of 400.
- Accounting records (`orders`) retain transactional integrity but all personal identification data (name, email, phone) is permanently anonymized.

---

## 2. Manual Attack Checklist

Verify system resilience against known threat vectors:

| Threat Vector | Attack Scenario | Expected Safe Result |
| :--- | :--- | :--- |
| **Unauthorized Order Read** | Authenticated Student A attempts to read `/orders/{orderId_of_Student_B}` | **DENIED**: Firestore rules return `PERMISSION_DENIED` (`isOwner(resource.data.uid)` fails). |
| **Direct Enrollment Write** | Student attempts to create `/enrollments/{uid}_{courseId}` via client SDK | **DENIED**: Firestore rules block student writes on `enrollments`. |
| **Video Link Extraction** | User inspects network tab or queries Firestore lesson document | **SAFE**: Video document only contains public metadata. Video GUID is stored in private subcollection. |
| **Direct HLS Playback** | Unenrolled user attempts to call `getVideoToken` | **DENIED**: Cloud Function returns `permission-denied` (active enrollment required). |
| **Admin Privilege Hijack** | Student calls admin-restricted functions (`refundPayment`, `sendNotification`, `createBunnyUpload`) | **DENIED**: Function throws `permission-denied` via `requireAdmin(request)` check. |
| **Profile Field Tampering** | User attempts to update `isBlocked: false` or `role: 'admin'` on their `/users/{uid}` doc | **DENIED**: Firestore rules enforce affected keys diff and forbid writing privileged fields. |
| **Forged Payment Signature** | Attacker calls `verifyPayment` with an arbitrary signature | **DENIED**: Cloud Function verifies HMAC-SHA256 signature with `crypto.timingSafeEqual` and rejects forged signatures. |
| **Replay Attack** | Attacker replays `verifyPayment` or `razorpayWebhook` multiple times | **SAFE**: Transactional idempotency prevents duplicate enrollments; duplicate calls return identical confirmation without duplicate side-effects. |

---

## 3. Video Architecture & Unlisted YouTube Model

### Unlisted Video Model & Limitations
- **Model**: Course videos are hosted on YouTube as **Unlisted** videos.
- **Limitation**: An unlisted YouTube video ID is not a secret once an enrolled student receives it to play. A determined user with developer tools or packet inspection could extract the video ID and view it outside the app on YouTube.
- **Mitigations**:
  1. The video ID is never stored in public Firestore documents; it is quarantined in the admin-only `private/media` subcollection.
  2. The ID is only issued to students with an active, unblocked enrollment via the server-side `getLessonPlayback` Cloud Function.
  3. Playback sessions require regular 60-second heartbeats (`playbackHeartbeat`); revoking an enrollment or blocking an account cuts off playback.
  4. Device session limits (default 2 active devices) detect and curtail account sharing.
  5. Screen capture is blocked on Android and detected on iOS.
  6. Admins have a one-click "Replace video" action in the admin console if a link leaks.

---

## 4. Secret Management & Deployment Configuration

All Cloud Functions are deployed in the **`asia-south1`** (Mumbai) region.

Required Google Cloud Secret Manager secrets:
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `YOUTUBE_API_KEY` (for server-side video validation in Step Y2)

Set these secrets using the Firebase CLI:
```bash
firebase functions:secrets:set RAZORPAY_KEY_ID
firebase functions:secrets:set RAZORPAY_KEY_SECRET
firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET
firebase functions:secrets:set YOUTUBE_API_KEY
```
