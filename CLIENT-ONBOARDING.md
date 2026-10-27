# 🚀 White-Label Client Onboarding Guide (15-Minute Checklist)

This step-by-step checklist enables you to provision, re-theme, and deploy a brand-new course mobile app and admin web portal for any creator or business in **under 15 minutes**, with zero prior coding experience required.

---

## ⏱ Timeline Overview

| Step | Task | Duration |
| :--- | :--- | :--- |
| **Step 1** | Create Firebase Project | 4 minutes |
| **Step 2** | Initialize Client Config | 2 minutes |
| **Step 3** | Deploy Database & Backend | 3 minutes |
| **Step 4** | Deploy Admin Panel | 2 minutes |
| **Step 5** | Build Mobile App (Android & iOS) | 4 minutes |

---

## Step 1: Create Client Firebase Project (4 mins)

1. Open [Firebase Console](https://console.firebase.google.com/) and click **Add project**.
2. Name the project after your client (e.g. `rohit-academy-app`).
3. Enable **Authentication**:
   - Go to **Build** $\rightarrow$ **Authentication** $\rightarrow$ **Sign-in method**.
   - Enable **Phone** (for OTP authentication) and **Google** (optional).
4. Enable **Firestore Database**:
   - Go to **Build** $\rightarrow$ **Firestore Database** $\rightarrow$ **Create database** in Production Mode.
   - Choose region: `asia-south1 (Mumbai)` for Indian creators, or nearest to your client.
5. Enable **Firebase Storage**:
   - Go to **Build** $\rightarrow$ **Storage** $\rightarrow$ **Get started** in Production Mode.
6. Register Web App & Download Credentials:
   - In **Project Settings** (gear icon), under "Your apps", click the **Web icon (`</>`)**.
   - Copy the `firebaseConfig` object (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).
7. Download `google-services.json` (for Android):
   - Under "Your apps", click **Add app** $\rightarrow$ **Android**.
   - Enter your client's package name (e.g. `com.rohitacademy.app`).
   - Download `google-services.json`.

---

## Step 2: Initialize Client in Codebase (2 mins)

Open your terminal in the project directory and run:

```bash
npm run client:new rohit-academy
```

This creates a new configuration file at `clients/rohit-academy/client.config.ts`.

### Edit `clients/rohit-academy/client.config.ts`:
1. **Brand**:
   - `appName`: "Rohit Academy"
   - `slug`: "rohit-academy"
   - `packageName`: "com.rohitacademy.app"
   - `logoUrl`: Link to client's high-resolution transparent logo PNG.
2. **Branding Colors**:
   - `primary`: Client's primary HEX color (e.g. `#E11D48` for Crimson or `#2563EB` for Royal Blue).
   - `accent`: Gold/Amber highlight color (`#F59E0B`).
3. **Payment & Video Keys**:
   - `razorpayKeyId`: Client's Razorpay Key ID (`rzp_live_...`).
   - `youtubeApiKey`: Google Cloud API Key for YouTube Data API v3 (set in Cloud Functions secrets).
4. **Firebase Credentials**:
   - Paste the `firebaseConfig` object copied from Step 1.
5. **Support Contacts**:
   - `supportPhone`, `supportWhatsApp`, and `supportEmail`.

```bash
# 1. Validate your client configuration against the strict schema
npm run client:validate rohit-academy

# 2. Switch the active project & update Admin .env automatically
npm run client:use rohit-academy
```

---

## Step 3: Deploy Backend Infrastructure (3 mins)

Our automated client manager CLI guarantees project safety by explicitly passing `--project <projectId>` to all operations:

```bash
# 1. Bootstrap clean Firestore /appConfig/main and /homeSections
# 2. Deploy hardened Firestore rules and indexes
npm run client:setup rohit-academy
```

Or deploy individual targets:

```bash
# Deploy Firestore security rules with strict project isolation
npm run deploy:backend rohit-academy
```

---

## Step 4: Deploy Admin Web Portal (2 mins)

Build and publish the client's branded Admin Dashboard to Firebase Hosting:

```bash
npm run deploy:admin
```

Your client's admin panel is now live at `https://<firebase-project-id>.web.app`!

### Granting Initial Admin Access:
1. Open the live Admin URL in a browser and click **Sign Up** or sign in with the client's email.
2. In terminal, promote the client's email to Administrator:
   ```bash
   node scripts/set-first-admin.js client-owner@rohitacademy.com
   ```
3. The client can now log in, upload courses, set prices, and schedule live classes.

---

## Step 5: Build Mobile App (4 mins)

### Test locally in Expo:
```bash
npm run start
```
Scan the QR code with Expo Go on Android or iOS. Notice that the entire app automatically adopted the new client's name, brand colors, and catalog!

### Generate Production Android APK / AAB for Play Store:
Place the client's `google-services.json` inside the root folder, then run:

```bash
# Build standalone Android Application Bundle (.aab)
npx eas-cli build --platform android --profile production
```

Upload the generated `.aab` file directly to Google Play Console!

---

## 🔁 Switching Between Existing Clients

To switch back to any client at any time:

```bash
npm run client:use youtube-sikho
# or
npm run client:use rohit-academy
```

Everything automatically re-themes and updates all environment files instantaneously.
