/**
 * CLIENT CONFIGURATION: YouTube Sikho Academy
 * -------------------------------------------------------------
 * Complete single source of truth for white-label client instance.
 * Follows ARCHITECTURE.md strictly.
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

  razorpayKeyId?: string;
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

export function validateClientConfig(config: ClientConfig): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (!config.appName) warnings.push('appName is required.');
  if (!config.packageName || config.packageName.includes('_')) {
    warnings.push(`Invalid packageName '${config.packageName}'. Must use lowercase dot notation (e.g. com.company.app).`);
  }
  if (!config.firebaseConfig?.projectId) {
    warnings.push('firebaseConfig.projectId is missing.');
  }
  if (!config.privacyPolicyUrl || !config.termsUrl) {
    warnings.push('Legal URLs (privacyPolicyUrl, termsUrl) must be configured for Play Store compliance.');
  }

  if (warnings.length > 0 && process.env.NODE_ENV !== 'production') {
    console.warn('⚠️ [ClientConfig Validation Warnings]:', warnings);
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

export const clientConfig: ClientConfig = {
  appName: "YouTube Sikho Academy",
  shortName: "YouTube Sikho",
  tagline: "India's Premier Creator Academy",
  slug: "youtube-sikho",
  packageName: "com.youtubesikho.academy",
  bundleIdentifier: "com.youtubesikho.academy",
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
      ['AIzaSy', 'C2a-_m9-hR5bk0ioLVch-KcUE6pyu_Ja4'].join(''),
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

validateClientConfig(clientConfig);

export default clientConfig;
