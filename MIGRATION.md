# 🔄 Platform Migration & Architecture Alignment Guide

This guide documents the database schema and media asset migrations required to align existing data with **ARCHITECTURE.md**.

---

## 1. Video Player & Media Assets (Bunny Stream Migration)

### Problem
Previously, lessons stored YouTube video IDs or direct URLs in the publicly readable lesson document (`courses/{courseId}/sections/{sectionId}/lessons/{lessonId}`), which bypassed paid enrollment checks and allowed any user to inspect and play videos directly.

### Migration Action
1. **Recorded Lessons**:
   - YouTube links for recorded lessons are **strictly deprecated**.
   - Admin must upload all lesson videos through the Admin Dashboard using the Bunny Stream modal.
   - Each uploaded video generates a unique Bunny Video GUID (e.g. `9f8e7d6c-5b4a-3210-fedc-ba9876543210`).
2. **Private Media Document Protection**:
   - The video GUID and master playback parameters are written to the private subcollection:
     `/courses/{courseId}/sections/{sectionId}/lessons/{lessonId}/private/media`
   - Public lesson documents retain only `title`, `duration`, `isFreePreview`, and `order`.
   - The mobile app requests time-limited signed `.m3u8` tokens from the `getVideoToken` Cloud Function, which verifies active enrollment before signing.

---

## 2. Quiz Anti-Cheat & Schema Alignment

### Schema Standardization
Fields across Firestore, Admin, Cloud Functions, and Mobile App are aligned to:
- `title` (string)
- `courseId` (string)
- `passingPercentage` (number)
- `timeLimitMinutes` (number)
- `questionCount` (number)
- Subcollection `/questions/{questionId}`:
  - `question` (string)
  - `options` (array of strings)
  - `correctAnswerIndex` (number, 0-indexed)
  - `explanation` (string)
  - `marks` (number)
  - `order` (number)

### Client Fetching
Students never read `/quizzes/{id}/questions` directly. The mobile app invokes the `getQuizQuestions` Cloud Function, which returns question prompts and options without the answer keys.

---

## 3. Server-Authoritative Razorpay & Enrollment Schema Migration

### Orders Schema Standardization
- Direct UPI simulated endpoints (`YouPI`), manual UTR entries, and client-side pricing are **strictly removed**.
- Database amounts are stored in integer paise (`amountPaise: number`), eliminating floating-point currency bugs.
- Order `status` values: `'created' | 'paid' | 'refunded' | 'failed'`.
- Orders can only be created and updated by Cloud Functions (`createOrder`, `verifyPayment`, `razorpayWebhook`, `refundPayment`) via the Firebase Admin SDK. Client-side write access is completely blocked in `firestore.rules`.

### Enrollments Schema Standardization
- Field `active: boolean` is migrated to unified lifecycle state: `status: 'active' | 'revoked' | 'expired'`.
- Key format: `enrollments/{uid}_{courseId}`.
- Student access checks inspect `status === 'active'`.
- All writes are restricted to Cloud Functions (`verifyPayment`, `razorpayWebhook`, `manageEnrollment`); client-side direct writes are denied in `firestore.rules`.

### Coupons Schema Standardization
- Document location: `coupons/{CODE}` (UPPERCASE string document ID).
- Fields:
  - `code` (string, uppercase)
  - `discountType` (`'percent' | 'flat'`)
  - `value` (number: percent 1-100 or flat INR)
  - `isActive` (boolean)
  - `maxUses` (number, 0 = unlimited)
  - `usedCount` (number, incremented inside atomic transaction)
  - `expiresAt` (ISO string or timestamp or null)
  - `minPrice` (optional minimum course price in rupees)
  - `courseIds` (optional array of restricted course IDs)
- Client-side reads from mobile are blocked in `firestore.rules`; coupon validation is performed server-side via the `validateCoupon` callable Cloud Function.
