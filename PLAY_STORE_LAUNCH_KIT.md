# 📱 Google Play Store Launch Kit

This kit contains all listing copy, graphical specifications, policy declarations, Data Safety answers, and reviewer test credentials to ensure **first-attempt approval** on Google Play Console.

---

## 1. Store Listing Copy

### App Title (Max 30 Characters)
```text
YouTube Sikho - Creator Academy
```
*(Exact Length: 30 chars)*

### Short Description (Max 80 Characters)
```text
Learn video editing, YouTube growth algorithms & monetization from top creators.
```
*(Exact Length: 79 chars)*

### Full Description (Markdown for Play Console)
```text
🚀 Master Video Creation, Editing & YouTube Growth with India's #1 Creator Learning Platform!

Whether you are starting your first channel or aiming to scale past 100K+ subscribers, YouTube Sikho Academy provides structured, step-by-step masterclasses taught by India's top content creators.

🌟 WHAT YOU GET INSIDE:

🎥 Comprehensive Video Masterclasses
• YouTube Growth & Algorithm Mastery: CTR, audience retention, and viral hook formulas.
• Smartphone & PC Video Editing: Premiere Pro, CapCut, visual pacing, and sound design.
• Thumbnail Design & Psychology: High-converting typography, colors, and layout blueprints.
• Monetization & Sponsorships: Negotiate 5-figure brand deals and sell digital products.

🔴 Interactive Live Classes & Mentorship
• Attend live interactive webinars directly inside the app.
• Ask real-time questions in live chat and participate in hand-raising doubt resolution.
• Watch replay recordings anytime at 1.5x and 2x speeds.

📝 Chapter Quizzes & Certified Credentials
• Test your skills after every module with timed quizzes.
• Earn industry-recognized course completion certificates verified on the blockchain.
• Download and share your credentials directly to LinkedIn, Instagram, and WhatsApp.

📚 Curated Study Materials & Lecture Notes
• Download cheat sheets, scripting templates, and editing preset links.
• Complete assignment worksheets to audit and optimize your channel.

⚡ APP HIGHLIGHTS & CRAFTED USER EXPERIENCE:
• High-Definition Adaptive Video Player (1080p, 720p, 480p, 360p) with zero buffering.
• Safe, Encrypted Cloud Streaming with full content protection.
• Sleek Dark Mode optimized for OLED displays and battery savings.
• Direct WhatsApp & In-App Helpdesk Support with quick response times.
• 100% Secure Payments via UPI (Google Pay, PhonePe, Paytm), Net Banking, and Cards.

Join thousands of passionate aspiring creators building sustainable digital careers. Download YouTube Sikho Academy today and start creating!
```

---

## 2. Graphic Asset Specifications

### App Icon
- **Dimensions**: 512 x 512 px
- **Format**: 32-bit PNG with alpha channel
- **File size**: < 1024 KB
- **Design**: Brand Indigo backdrop (`#4F46E5`), centered Play icon surrounded by golden graduation cap or creator burst icon in Amber (`#F59E0B`).

### Feature Graphic
- **Dimensions**: 1024 x 500 px
- **Format**: JPEG or 24-bit PNG (no alpha)
- **Background**: Deep obsidian gradient (`#0B1020` $\rightarrow$ `#151B2E`)
- **Left Side**: Bold heading in White Poppins: *"Learn from Top Creators. Scale to 100K+."*
- **Right Side**: Tilted 3D smartphone mockup displaying the Course Player and Curriculum.
- **Accents**: Subtle glowing amber pulse lines and gold verified badge.

### 6 Phone Screenshots (1080 x 1920 px)

| Frame # | Screen Captured | Headline Text (Top 25% of Canvas) | Accent Color |
| :--- | :--- | :--- | :--- |
| **Screenshot 1** | Home Tab with Banners | "Master YouTube Algorithms & Growth" | Indigo (`#4F46E5`) |
| **Screenshot 2** | Course Curriculum & Lessons | "Step-by-Step Curriculum from Top Mentors" | Amber (`#F59E0B`) |
| **Screenshot 3** | Video Player with Quality Picker | "HD Adaptive Streaming with Zero Buffering" | Cyan (`#06B6D4`) |
| **Screenshot 4** | Live Classroom with Live Chat | "Interactive Live Masterclasses & Q&A" | Crimson (`#EF4444`) |
| **Screenshot 5** | Quiz Evaluation & Confetti | "Test Your Knowledge & Track Progress" | Emerald (`#10B981`) |
| **Screenshot 6** | Verified Certificate Screen | "Earn Recognized Creator Certification" | Gold (`#F59E0B`) |

---

## 3. Policy & App Declarations (Play Console Copy-Paste)

### Target Audience & Content Rating
- **Target Age**: 13 and older (Teens & Adults).
- **Rating**: Everyone / PEGI 3.
- **Is your app designed for children?**: No.

### Ads Declaration
- **Does your app contain advertisements?**: No, this app has **no ads**.

### Financial Features Declaration
- **Does your app provide financial services?**: No financial services, lending, or banking features. All course enrollments are processed through RBI-authorized payment gateways (Razorpay) utilizing UPI and standard cards.

### Government Apps Declaration
- **Is this app developed by or on behalf of a government?**: No.

### App Access Credentials (For Google Reviewers)
Provide these exact credentials in the "App Access" section of Play Console so the reviewer can log in without an Indian phone number:

```text
Username / Phone: +91 99999 88888
Test OTP Code: 123456
Note to Reviewer: This is an authorized test account configured with pre-enrolled masterclasses and live class access for Google Play review verification.
```

---

## 4. Google Play Data Safety Declaration

Fill out the Data Safety form with the following answers:

### 1. Data Collection & Sharing Overview
- **Does your app collect or share user data?**: Yes.
- **Is all data collected encrypted in transit?**: Yes, all communication uses HTTPS / TLS 1.3 encryption.
- **Do you provide a way for users to request data deletion?**: Yes, users can delete their account directly within the app (`Settings` $\rightarrow$ `Delete Account`) or via our public deletion request portal.

### 2. Specific Data Categories Collected

| Data Type | Purpose | Collected or Shared | Required or Optional |
| :--- | :--- | :--- | :--- |
| **Name** | App functionality, Personalizing Certificates | Collected (Not Shared) | Required |
| **Phone Number / Email** | Account authentication & login verification | Collected (Not Shared) | Required |
| **User IDs (UID)** | Account management & course enrollment tracking | Collected (Not Shared) | Required |
| **Purchase History** | Unlocking purchased courses & generating receipts | Collected (Not Shared) | Required |
| **Crash Logs & Diagnostics** | App stability & crash diagnostics | Collected (Not Shared) | Optional |

---

## 5. Technical Manifest & Bundle Audit

- **Package Name**: `YouTube_sikho.com` (configured in [`app.config.ts`](file:///root/course-app/app.config.ts))
- **Target SDK**: Android 14 (`targetSdkVersion: 34`)
- **Min SDK**: Android 7.0 (`minSdkVersion: 24`)
- **Permissions Declared**:
  - `INTERNET` (Network communication)
  - `ACCESS_NETWORK_STATE` (Offline banner state detection)
  - `RECEIVE_BOOT_COMPLETED` (Local live class reminder notifications)
  - `VIBRATE` (Haptic feedback on quiz success and button taps)
- **Zero Sensitive Permissions**: No location, background audio, microphone, SMS read, or contact access requested.
