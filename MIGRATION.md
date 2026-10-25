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

## 3. Server-Authoritative Razorpay Migration

### Orders & Enrollment
- Direct UPI simulated endpoints (`YouPI`) are removed.
- Payment flow uses `createOrder` (authenticated student, server price calculation) and `verifyPayment` (HMAC-SHA256 signature verification via `crypto.timingSafeEqual`).
- Enrollments are written exclusively by Cloud Functions upon signature verification.
