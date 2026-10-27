/**
 * CLIENT CONFIGURATION: YouTube Sikho Academy
 * -------------------------------------------------------------
 * Complete single source of truth for white-label client instance.
 * Validated strictly against src/config/schema.ts.
 */

import { ClientConfig, validateClientConfig } from '../../src/config/schema';

export const clientConfig: ClientConfig = {
  appName: "YouTube Sikho Academy",
  shortName: "YouTube Sikho",
  tagline: "India's Premier Creator Academy",
  slug: "youtube-sikho",
  packageName: "com.youtubesikho.academy",
  bundleIdentifier: "com.youtubesikho.academy",
  scheme: "youtubesikho",
  version: "1.0.0",
  logoUrl: "./assets/icon.png",
  splashUrl: "./assets/splash.png",
  faviconUrl: "./assets/icon.png",

  colors: {
    primary: "#4F46E5",
    primaryDark: "#4338CA",
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

  supportPhone: process.env.EXPO_PUBLIC_SUPPORT_PHONE || "",
  supportWhatsApp: process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP || "",
  supportEmail: "support@youtubesikho.com",

  companyLegalName: "YouTube Sikho Education LLP",
  websiteUrl: "https://sikho-77341.web.app",
  privacyPolicyUrl: "https://youtubesikho.com/privacy",
  termsUrl: "https://youtubesikho.com/terms",
  refundPolicyUrl: "https://youtubesikho.com/refund",
  dataDeletionUrl: "https://youtubesikho.com/delete-account",

  razorpayKeyId: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || "",
  bunnyLibraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID || "",
  bunnyCdnHostname: process.env.EXPO_PUBLIC_BUNNY_CDN_HOSTNAME || "",

  firebaseConfig: {
    apiKey:
      process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
      "AIzaSyC2a-_m9-hR5bk0ioLVch-KcUE6pyu_Ja4",
    authDomain: "sikho-77341.firebaseapp.com",
    projectId: "sikho-77341",
    storageBucket: "sikho-77341.firebasestorage.app",
    messagingSenderId: "202721234137",
    appId: "1:202721234137:android:1188f0afdaa07568efc2c8",
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

const validation = validateClientConfig(clientConfig);
if (!validation.valid && typeof __DEV__ !== 'undefined' && __DEV__) {
  console.error('❌ [ClientConfig Validation Errors]:', validation.errors);
}

export { ClientConfig, validateClientConfig };
export default clientConfig;
