# 🏛 System Architecture & Technical Specifications

This document outlines the full end-to-end architecture, data flows, Firestore collection schemas, and Cloud Functions catalog for the **YouTube Sikho Course App Platform**.

---

## 1. High-Level Architecture Diagram

```mermaid
flowchart TD
    subgraph Client Apps
        MobileApp["Mobile App (React Native / Expo)"]
        AdminWeb["Admin Web Portal (React / Vite)"]
    end

    subgraph Firebase Cloud
        Auth["Firebase Auth (Phone OTP / Google)"]
        Firestore["Cloud Firestore (Real-Time Database)"]
        Functions["Firebase Cloud Functions (Node.js / Express)"]
        Storage["Firebase Storage (Assets / PDFs)"]
        FCM["Firebase Cloud Messaging (Push Notifications)"]
    end

    subgraph External Infrastructure
        Razorpay["Razorpay Gateway (UPI, Cards, NetBanking)"]
        YouTube["YouTube Video & Live Engine (Unlisted / Embedded)"]
    end

    MobileApp <--> |Realtime onSnapshot / Offline Cache| Firestore
    AdminWeb <--> |Realtime onSnapshot Management| Firestore

    MobileApp --> |User Login / Token| Auth
    AdminWeb --> |Admin Custom Claims| Auth

    MobileApp --> |Signed Callable Requests| Functions
    AdminWeb --> |Refunds / Video Links / Grants| Functions

    Functions --> |HMAC Verification & Webhooks| Razorpay
    MobileApp --> |Official IFrame Player (youtube-nocookie.com)| YouTube
    MobileApp --> |Live Embed / Chat| YouTube
    Functions --> |Targeted Notification Push| FCM
    FCM --> |Push Alert Delivery| MobileApp
```

---

## 2. Core Operational Data Flows

### A. Course Purchase & Instant Enrollment
1. **Initiate**: Student taps "Enroll Now" in [`app/checkout/[courseId].tsx`](app/checkout/[courseId].tsx).
2. **Order Creation**: Client calls `createOrder` Cloud Function with `courseId` and optional `couponCode`.
3. **Price Calculation**: Cloud Function calculates final discounted amount on the server (preventing client-side tampering) and requests an official `order_id` from Razorpay API.
4. **Checkout Modal**: Mobile app opens native Razorpay checkout sheet with UPI / Google Pay / Cards.
5. **Signature Verification**: On payment success, client sends payment ID and signature to `verifyPayment` Cloud Function.
6. **Enrollment Unlock**: Cloud Function verifies SHA-256 HMAC cryptographic signature against `RAZORPAY_KEY_SECRET`. Upon confirmation, it writes an active record to `/enrollments/{uid}_{courseId}` and records receipt in `/orders/{orderId}`.
7. **Real-time Activation**: Mobile app's `onSnapshot` listener on `/enrollments` triggers instantly, unlocking all course lessons without requiring an app refresh.

---

### B. Secure Unlisted YouTube Video Playback
1. **Lesson Access Check**: Student taps a video lesson in [`app/player/[lessonId].tsx`](app/player/[lessonId].tsx).
2. **Access Verification**: Client invokes `getLessonPlayback` Cloud Function providing `courseId`, `sectionId`, and `lessonId`.
3. **Authorization**: Server confirms caller has an active enrollment in `/enrollments/{uid}_{courseId}` or `isFreePreview: true`.
4. **ID Resolution**: Function reads `videoId` from the admin-only subcollection `/courses/{courseId}/sections/{s}/lessons/{l}/private/media` via the Admin SDK.
5. **Secure Stream**: Player embeds the official YouTube IFrame player using `youtube-nocookie.com`. Session sends `playbackHeartbeat` every 60 seconds; revoking enrollment or exceeding 2 active devices terminates the playback session.

---

### C. Live Interactive Classes & Doubt Clearing
1. **Class Scheduling**: Admin creates or starts a live class in [`admin/src/pages/LiveClasses.tsx`](admin/src/pages/LiveClasses.tsx).
2. **Real-Time Notification**: Cloud Function dispatches FCM push notification to all students enrolled in the course.
3. **Live Sync**: Mobile [`app/(tabs)/live.tsx`](app/(tabs)/live.tsx) displays flashing red `LIVE NOW` badge.
4. **Interactive Room**: Students enter the live room, watch the live broadcast, participate in rate-limited real-time chat, and raise hands for doubt clearing.
5. **Replay Archiving**: When admin ends the stream, the class status updates to `ended` and the replay recording is immediately made available for students.

---

## 3. Firestore Collection Schema Catalog

| Collection Path | Document Key Format | Primary Fields & Types | Purpose | Access Control |
| :--- | :--- | :--- | :--- | :--- |
| `/appConfig/main` | `main` | `appName` (string), `colors` (map), `maintenanceMode` (boolean), `minAppVersion` (string), `supportWhatsApp` (string) | Remote theming, emergency maintenance switch, and global contacts | Public Read, Admin Write |
| `/categories` | `category_{id}` | `name` (string), `order` (number), `icon` (string), `slug` (string) | Course taxonomy filter chips | Public Read, Admin Write |
| `/courses` | `course_{id}` | `title` (string), `price` (number), `discountPrice` (number), `thumbnailUrl` (string), `isPublished` (boolean), `sections` (array) | Course master data and syllabus curriculum | Public Read (Published), Admin Write |
| `/banners` | `banner_{id}` | `title` (string), `imageUrl` (string), `targetType` (string), `targetValue` (string), `order` (number), `isVisible` (boolean) | Home promotional carousel slides | Public Read, Admin Write |
| `/homeSections` | `sec_{type}` | `type` (string), `title` (string), `order` (number), `isVisible` (boolean) | Dynamic reordering and visibility of home screen modules | Public Read, Admin Write |
| `/users` | `{uid}` | `name` (string), `phone` (string), `email` (string), `isBlocked` (boolean), `fcmToken` (string), `createdAt` (timestamp) | Student user profiles and device push tokens | Owner Read/Write, Admin Read/Write |
| `/enrollments` | `{uid}_{courseId}` | `uid` (string), `courseId` (string), `status` (active / revoked), `enrolledAt` (timestamp) | Access entitlement record | Owner Read, Functions/Admin Write |
| `/orders` | `{orderId}` | `uid` (string), `courseId` (string), `amount` (number), `status` (paid / refunded), `razorpayPaymentId` (string) | Payment receipts and transaction auditing | Owner Read, Functions/Admin Write |
| `/coupons` | `{code}` | `code` (string), `discountType` (percentage/fixed), `value` (number), `isActive` (boolean), `maxUses` (number) | Checkout discount validation | Authenticated Read, Admin Write |
| `/liveClasses` | `class_{id}` | `title` (string), `courseId` (string), `scheduledAt` (string), `streamUrl` (string), `status` (scheduled/live/ended), `chatEnabled` (boolean) | Live broadcast schedules and status tracking | Authenticated Read, Admin Write |
| `/liveClasses/{id}/messages` | `msg_{id}` | `senderId` (string), `senderName` (string), `message` (string), `createdAt` (timestamp) | Real-time live room student chat stream | Enrolled Read/Write, Admin Moderate |
| `/materials` | `mat_{id}` | `courseId` (string), `title` (string), `type` (pdf/zip/link), `storagePath` (string), `sizeBytes` (number), `order` (number), `isPublished` (boolean) | Course study resources and notes | Enrolled Read (Signed URLs), Admin Write |
| `/quizzes` | `quiz_{id}` | `title` (string), `courseId` (string), `passingPercentage` (number), `timeLimitMinutes` (number), `questionCount` (number), `allowRetries` (boolean), `maxAttempts` (number), `negativeMarkingEnabled` (boolean), `showAnswersAfterSubmit` (boolean) | Quiz metadata for students | Authenticated Read, Admin Write |
| `/quizzes/{id}/questions` | `q_{id}` | `question` (string), `options` (array), `correctAnswerIndex` (number), `explanation` (string), `marks` (number), `order` (number) | True answers and scoring key | Cloud Functions & Admin ONLY (Student Read DENIED) |
| `/quizAttempts` | `{uid}_{quizId}` | `attemptId` (string), `uid` (string), `startedAt` (timestamp), `expiresAtMs` (number), `status` (in_progress/completed) | Server-authoritative timer and attempt tracking | Owner Read, Cloud Functions Write |
| `/quizResults` | `{uid}_{quizId}_{attempt}` | `uid` (string), `quizId` (string), `score` (number), `percentage` (number), `passed` (boolean), `isLate` (boolean), `breakdown` (array) | Verified test evaluation results | Owner Read, Cloud Functions Write |
| `/quizBest` | `{uid}_{quizId}` | `uid` (string), `quizId` (string), `score` (number), `bestResultId` (string) | Student high-score pointer | Owner Read, Cloud Functions Write |
| `/progress` | `{uid}_{courseId}` | `uid` (string), `courseId` (string), `lastLessonId` (string), `lastPosition` (number), `completedLessons` (array), `percentComplete` (number), `isCompleted` (boolean) | Real-time course syllabus tracking | Owner Read, Position Client Write, Completion Functions Write |
| `/certificates` | `{certId}` | `id` (string), `uid` (string), `studentName` (string), `courseId` (string), `courseTitle` (string), `issuedAt` (string), `clientName` (string), `verifyUrl` (string) | Course completion certificates with online verification | Public Read, Cloud Functions Write |
| `/tickets` | `ticket_{id}` | `uid` (string), `studentName` (string), `subject` (string), `status` (open/in_progress/resolved), `messages` (array) | In-app customer support desk | Owner Read/Write, Admin Read/Write |

---

## 4. Cloud Functions Catalog (Region: `asia-south1`)

| Function Name | Type & Trigger | Input Parameters | Output Response | Secrets Bound | Auth Requirement | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `validateCoupon` | `onCall` | `{ code, courseId }` | `{ valid, discountPaise, finalPricePaise }` | None | Public / Auth | ✅ Live |
| `createOrder` | `onCall` | `{ courseId, couponCode? }` | `{ orderId, razorpayOrderId, amountPaise, currency }` | `razorpaySecrets` | Authenticated Student | ✅ Live |
| `verifyPayment` | `onCall` | `{ orderId, razorpayPaymentId, razorpaySignature }` | `{ success: true, enrollmentId, alreadyProcessed }` | `razorpaySecrets` | Authenticated Student | ✅ Live |
| `razorpayWebhook` | `onRequest` | Webhook Payload & `X-Razorpay-Signature` | `{ status: "ok" }` | `razorpaySecrets` | HMAC Verification | ✅ Live |
| `refundPayment` | `onCall` | `{ orderId, amount?, reason? }` | `{ success: true, refundId, status }` | `razorpaySecrets` | Admin Role Required | ✅ Live |
| `setAdminClaim` | `onCall` | `{ targetUid, admin, role? }` | `{ success: true, uid, admin, role }` | None | Owner Role Required | ✅ Live |
| `validateYoutubeVideo` | `onCall` | `{ url }` | `{ videoId, title, durationSeconds, privacyStatus, embeddable }` | `youtubeSecrets` | Admin Role Required | ✅ Live |
| `manageEnrollment` | `onCall` | `{ action: "grant" \| "revoke", targetUid, courseId, reason? }` | `{ success: true, action, enrollmentId }` | None | Admin Role Required | ✅ Live |
| `sendNotification` | `onCall` | `{ title, body, imageUrl?, actionType, actionValue?, target }` | `{ success: true, recipients, delivered, failed }` | None | Admin Role Required | ✅ Live |
| `getQuizQuestions` | `onCall` | `{ quizId }` | `{ attemptId, startedAt, expiresAt, serverNow, questions: [...] }` | None | Enrolled Student / Free | ✅ Live |
| `submitQuiz` | `onCall` | `{ attemptId, quizId, answers, timeTakenSeconds }` | `{ resultId, score, maxScore, percentage, passed, breakdown }` | None | Authenticated Student Owner | ✅ Live |
| `markLessonComplete` | `onCall` | `{ courseId, lessonId, watchedSeconds? }` | `{ success: true, completedLessons, percentage, isFullyCompleted }` | None | Enrolled Student | ✅ Live |
| `issueCertificate` | `onCall` | `{ courseId }` | `{ success: true, certificateId, certificate: {...} }` | None | Enrolled Student (100% Complete) | ✅ Live |
| `getMaterialUrl` | `onCall` | `{ courseId, materialId }` | `{ downloadUrl, expiresAt, title, fileName }` | None | Enrolled Student / Admin | ✅ Live |
| `getLiveStream` | `onCall` | `{ classId }` | `{ liveUrl, status, chatEnabled }` | None | Enrolled Student / Admin | ✅ Live |
| `deleteCourse` | `onCall` | `{ courseId }` | `{ success: true, courseId }` | None | Admin Role Required | ✅ Live |
| `deleteQuiz` | `onCall` | `{ quizId }` | `{ success: true, quizId }` | None | Admin Role Required | ✅ Live |
| `deleteLiveClass` | `onCall` | `{ classId }` | `{ success: true, classId }` | None | Admin Role Required | ✅ Live |
| `deleteAccount` | `onCall` | `{}` | `{ success: true, purgedAt }` | None | Authenticated User (Recent Login) | ✅ Live |
| `blockUser` | `onCall` | `{ uid, reason? }` | `{ success: true, message }` | None | Admin Role Required | ✅ Live |
| `unblockUser` | `onCall` | `{ uid }` | `{ success: true, message }` | None | Admin Role Required | ✅ Live |
| `onOrderStatsUpdate` | `onDocumentWritten` | `orders/{orderId}` | Aggregates daily & total revenue, orders, refunds | None | Trigger | ✅ Live |
| `onUserCreatedStats` | `onDocumentCreated` | `users/{uid}` | Increments total student counts & daily signups | None | Trigger | ✅ Live |
| `onUserDeletedStats` | `onDocumentDeleted` | `users/{uid}` | Decrements total student counter | None | Trigger | ✅ Live |
| `onCoursePublished` | `onDocumentWritten` | `courses/{courseId}` | Dispatches broadcast notification to all students | None | Trigger | ✅ Live |
| `onLiveClassReminder`| `onSchedule` | `every 5 minutes` | Dispatches push notification for starting classes | None | Scheduled Cron | ✅ Live |
| `dailyMaintenance` | `onSchedule` | `every 24 hours` | Prunes expired `rateLimits` and `processedEvents` | None | Scheduled Cron | ✅ Live |

---

### Function in ARCHITECTURE.md vs Function in Code Reconciled

| Catalog Function Name | Code Implementation | Status & Reconciled Decision |
| :--- | :--- | :--- |
| `getLessonPlayback` | Handled via official YouTube IFrame player client SDK with server-validated `enrollments/{uid}_{courseId}` security rules. Video tokens / proxies removed per YouTube API Services Developer Policies (Part 5). | Retired per YouTube Compliance |
| `playbackHeartbeat` | Position tracking saved directly to `progress/{uid}_{courseId}` via debounced client save; completion validated authoritatively via `markLessonComplete`. | Streamlined per Part 6.4 |
| `auditLog` | Replaced legacy `auditLogs` with canonical server-only `auditLog/{id}` collection and structured `writeAuditLog` helper. | Hardened in Part 7.5 |

---

## 5. Security & Secret Binding Catalog

All functions are provisioned with explicit `secrets: [...]` declarations:

| Secret Name | Bound Functions | Purpose |
| :--- | :--- | :--- |
| `RAZORPAY_KEY_ID` | `createOrder`, `verifyPayment`, `razorpayWebhook`, `refundPayment` | Authenticates with Razorpay REST API |
| `RAZORPAY_KEY_SECRET` | `createOrder`, `verifyPayment`, `razorpayWebhook`, `refundPayment` | HMAC-SHA256 order signature verification and refund execution |
| `RAZORPAY_WEBHOOK_SECRET` | `razorpayWebhook` | Verifies gateway webhook push payloads |
| `YOUTUBE_API_KEY` | `validateYoutubeVideo` | Inspects unlisted YouTube videos for embeddability and duration metadata |
