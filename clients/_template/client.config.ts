/**
 * CLIENT CONFIGURATION TEMPLATE
 * -------------------------------------------------------------
 * Copy this file to clients/<clientName>/client.config.ts and fill in
 * the brand details, Firebase project keys, and color themes.
 */

export interface ClientConfig {
  appName: string;
  shortName: string;
  tagline: string;
  slug: string;
  packageName: string;
  bundleIdentifier: string;
  version: string;
  logoUrl: string;
  splashUrl?: string;
  faviconUrl?: string;

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

  supportPhone: string;
  supportWhatsApp: string;
  supportEmail: string;

  companyLegalName: string;
  privacyPolicyUrl: string;
  termsUrl: string;
  refundPolicyUrl: string;
  dataDeletionUrl: string;

  razorpayKeyId: string;
  bunnyLibraryId?: string;
  bunnyCdnHostname?: string;

  firebaseConfig: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };

  features: {
    liveClassesEnabled: boolean;
    quizzesEnabled: boolean;
    certificateEnabled: boolean;
    communityChatEnabled: boolean;
    offlineDownloadEnabled: boolean;
    referralEnabled: boolean;
    reviewsEnabled: boolean;
  };
}

export const clientConfig: ClientConfig = {
  appName: "Creator Academy",
  shortName: "Academy",
  tagline: "Learn from the very best",
  slug: "creator-academy",
  packageName: "com.creator.academy",
  bundleIdentifier: "com.creator.academy",
  version: "1.0.0",
  logoUrl: "https://via.placeholder.com/200x200.png?text=Logo",
  splashUrl: "./assets/splash.png",
  faviconUrl: "./assets/icon.png",

  colors: {
    primary: "#2563EB", // Brand primary
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
  supportEmail: "support@example.com",

  companyLegalName: "Creator Academy Private Limited",
  privacyPolicyUrl: "https://example.com/privacy",
  termsUrl: "https://example.com/terms",
  refundPolicyUrl: "https://example.com/refund",
  dataDeletionUrl: "https://example.com/delete-account",

  razorpayKeyId: "rzp_live_CLIENT_KEY",
  bunnyLibraryId: "YOUR_BUNNY_LIBRARY_ID",
  bunnyCdnHostname: "video.yourdomain.com",

  firebaseConfig: {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",
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
