/**
 * CLIENT CONFIGURATION TEMPLATE
 * -------------------------------------------------------------
 * Copy this file to clients/<clientName>/client.config.ts and fill in
 * the brand details, Firebase project keys, and color themes.
 * Must conform to src/config/schema.ts.
 */

import { ClientConfig } from '../../src/config/schema';

export const clientConfig: ClientConfig = {
  appName: "Creator Academy",
  shortName: "Academy",
  tagline: "Learn from the very best",
  slug: "creator-academy",
  packageName: "com.creator.academy",
  bundleIdentifier: "com.creator.academy",
  scheme: "creatoracademy",
  version: "1.0.0",
  logoUrl: "./assets/icon.png",
  splashUrl: "./assets/splash.png",
  faviconUrl: "./assets/icon.png",

  colors: {
    primary: "#2563EB",
    primaryDark: "#1D4ED8",
    secondary: "#1E293B",
    accent: "#F59E0B",
    background: "#0B1020",
    surface: "#151B2E",
    text: "#F1F5F9",
    textMuted: "#94A3B8",
    border: "#26304A",
    error: "#DC2626",
    success: "#16A34A",
  },

  supportPhone: "",
  supportWhatsApp: "",
  supportEmail: "support@myacademy.org",

  companyLegalName: "Creator Academy LLP",
  websiteUrl: "https://myacademy.org",
  privacyPolicyUrl: "https://myacademy.org/privacy",
  termsUrl: "https://myacademy.org/terms",
  refundPolicyUrl: "https://myacademy.org/refund",
  dataDeletionUrl: "https://myacademy.org/delete-account",

  razorpayKeyId: "",
  bunnyLibraryId: "",
  bunnyCdnHostname: "",

  firebaseConfig: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
  },

  features: {
    liveClassesEnabled: true,
    quizzesEnabled: true,
    certificateEnabled: true,
    communityChatEnabled: true,
    offlineDownloadEnabled: false,
    referralEnabled: false,
    reviewsEnabled: true,
  },
};

export default clientConfig;
