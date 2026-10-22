/**
 * WHITE-LABEL CLIENT CONFIGURATION
 * -------------------------------------------------------------
 * This is the SINGLE SOURCE OF TRUTH for white-label rebranding.
 * To rebrand this app for a new client:
 *  1. Change values in this file (appName, packageName, colors, phone, firebaseConfig, etc.)
 *  2. For Expo Go: update firebaseConfig below with client's Firebase credentials.
 *  3. For EAS Build: replace google-services.json in root.
 */

export interface ClientConfig {
  /** Display name of the application */
  appName: string;
  /** Short identifier slug for Expo / URL schemes */
  slug: string;
  /** Android package name (Application ID) */
  packageName: string;
  /** iOS bundle identifier */
  bundleIdentifier: string;
  /** App version code / display version */
  version: string;
  /** Brand logo (Remote URL or local require asset) */
  logoUrl: string;
  /** App branding colors */
  colors: {
    primary: string;
    primaryDark: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
    error: string;
    success: string;
  };
  /** Customer Support Details */
  supportPhone: string;
  /** WhatsApp Support phone number with country code */
  supportWhatsApp: string;
  /** Official Support Email */
  supportEmail: string;
  /** Legal & Policies */
  privacyPolicyUrl: string;
  termsUrl: string;
  /** Razorpay Public Key ID (Test or Live) */
  razorpayKeyId: string;
  /** Firebase Web / Expo Go Configuration */
  firebaseConfig: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
}

export const clientConfig: ClientConfig = {
  appName: "YouTube Sikho Academy",
  slug: "youtube-sikho",
  packageName: "YouTube_sikho.com",
  bundleIdentifier: "com.youtubesikho.academy",
  version: "1.0.0",
  logoUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80",
  colors: {
    primary: "#4F46E5", // Modern Indigo brand color
    primaryDark: "#4338CA",
    secondary: "#1E293B",
    accent: "#F59E0B",
    background: "#0B1020", // Sleek dark theme
    surface: "#151B2E",
    text: "#F1F5F9",
    textMuted: "#94A3B8",
    border: "#26304A",
    error: "#DC2626",
    success: "#16A34A",
  },
  supportPhone: "+919876543210",
  supportWhatsApp: "+919876543210",
  supportEmail: "support@youtubesikho.com",
  privacyPolicyUrl: "https://youtubesikho.com/privacy",
  termsUrl: "https://youtubesikho.com/terms",
  razorpayKeyId: "rzp_test_yt_sikho_519827",
  firebaseConfig: {
    apiKey: "AIzaSyC2a-_m9-hR5bk0ioLVch-KcUE6pyu_Ja4",
    authDomain: "sikho-77341.firebaseapp.com",
    projectId: "sikho-77341",
    storageBucket: "sikho-77341.firebasestorage.app",
    messagingSenderId: "202721234137",
    appId: "1:202721234137:android:0f96cea8ee5c0f29efc2c8",
  },
};

export default clientConfig;
