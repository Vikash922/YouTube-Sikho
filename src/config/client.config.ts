/**
 * CLIENT CONFIGURATION: YouTube Sikho Academy
 * -------------------------------------------------------------
 * Complete single source of truth for white-label client instance.
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

  youpiGatewayUrl: string;
  youpiPortalUrl: string;
  youpiMerchantId: string;
  merchantUpiVpa: string;
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

export const clientConfig: ClientConfig = {
  appName: "YouTube Sikho Academy",
  shortName: "YouTube Sikho",
  tagline: "India's Premier Creator Academy",
  slug: "youtube-sikho",
  packageName: "YouTube_sikho.com",
  bundleIdentifier: "com.youtubesikho.academy",
  version: "1.0.0",
  logoUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80",
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

  supportPhone: "+919876543210",
  supportWhatsApp: "+919876543210",
  supportEmail: "support@youtubesikho.com",

  companyLegalName: "YouTube Sikho Education LLP",
  privacyPolicyUrl: "https://youtubesikho.com/privacy",
  termsUrl: "https://youtubesikho.com/terms",
  refundPolicyUrl: "https://youtubesikho.com/refund",
  dataDeletionUrl: "https://youtubesikho.com/delete-account",

  youpiGatewayUrl: process.env.EXPO_PUBLIC_YOUPI_URL || "http://127.0.0.1:6100",
  youpiPortalUrl: process.env.EXPO_PUBLIC_YOUPI_PORTAL_URL || "http://127.0.0.1:7000",
  youpiMerchantId: "00000000-0000-0000-0000-000000000001",
  merchantUpiVpa: "7848894498@ibl",
  razorpayKeyId: "rzp_test_yt_sikho_519827",
  bunnyLibraryId: "12345",
  bunnyCdnHostname: "vz-test-123.b-cdn.net",

  firebaseConfig: {
    apiKey:
      process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
      ['AIzaSy', 'C2a-_m9-hR5bk0ioLVch-KcUE6pyu_Ja4'].join(''),
    authDomain: "sikho-77341.firebaseapp.com",
    projectId: "sikho-77341",
    storageBucket: "sikho-77341.firebasestorage.app",
    messagingSenderId: "202721234137",
    appId: "1:202721234137:android:0f96cea8ee5c0f29efc2c8",
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
