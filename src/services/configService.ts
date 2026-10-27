import { firebaseFirestore, doc, getDoc, onSnapshot } from './firebase';
import { clientConfig } from '../config/client.config';

export interface AppRemoteConfig {
  appName: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  supportPhone?: string;
  supportWhatsApp?: string;
  supportEmail?: string;
  maintenanceMode: boolean;
  minVersion: string;
  latestVersion?: string;
  privacyUrl?: string;
  termsUrl?: string;
  razorpayKeyId?: string;
  announcementActive?: boolean;
  announcementText?: string;
  announcementUrl?: string;
  playStoreUrl?: string;
  appStoreUrl?: string;
}

const DEFAULT_CONFIG: AppRemoteConfig = {
  appName: clientConfig.appName,
  logoUrl: clientConfig.logoUrl,
  primaryColor: clientConfig.colors.primary,
  secondaryColor: clientConfig.colors.secondary,
  accentColor: clientConfig.colors.accent,
  supportPhone: clientConfig.supportPhone,
  supportWhatsApp: clientConfig.supportWhatsApp,
  supportEmail: clientConfig.supportEmail,
  maintenanceMode: false,
  minVersion: clientConfig.version,
  privacyUrl: clientConfig.privacyPolicyUrl,
  termsUrl: clientConfig.termsUrl,
  announcementActive: false,
  announcementText: '',
  announcementUrl: '',
  playStoreUrl: 'https://play.google.com/store/apps',
  appStoreUrl: 'https://apps.apple.com',
};

/**
 * Fetches dynamic runtime config from Firestore document: appConfig/main
 */
export async function fetchRemoteConfig(): Promise<AppRemoteConfig> {
  try {
    const docRef = doc(firebaseFirestore, 'appConfig', 'main');
    const docSnapshot = await getDoc(docRef);

    if (docSnapshot.exists()) {
      const data = docSnapshot.data() as Partial<AppRemoteConfig>;
      return {
        ...DEFAULT_CONFIG,
        ...data,
      };
    }
    return DEFAULT_CONFIG;
  } catch (error) {
    console.warn('[configService] Failed to load remote config, using defaults:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Real-time listener for runtime configuration changes (appConfig/main)
 */
export function subscribeToRemoteConfig(
  onUpdate: (config: AppRemoteConfig) => void,
  onError?: (err: Error) => void
): () => void {
  const docRef = doc(firebaseFirestore, 'appConfig', 'main');
  return onSnapshot(
    docRef,
    (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data() as Partial<AppRemoteConfig>;
        onUpdate({
          ...DEFAULT_CONFIG,
          ...data,
        });
      } else {
        onUpdate(DEFAULT_CONFIG);
      }
    },
    (error) => {
      console.warn('[configService] Realtime config subscription error:', error);
      if (onError) onError(error);
    }
  );
}
