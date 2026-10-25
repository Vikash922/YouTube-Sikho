import { ConfigContext } from 'expo/config';

// Safe loader that works with pure TypeScript client.config.ts without needing a .js duplicate
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { clientConfig } = require('./scripts/load-client-config');

export default ({ config }: ConfigContext): any => ({
  ...config,
  name: clientConfig.appName,
  slug: clientConfig.slug,
  version: clientConfig.version,
  runtimeVersion: {
    policy: 'appVersion',
  },
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: clientConfig.colors.background,
  },
  scheme: clientConfig.slug,
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: clientConfig.bundleIdentifier,
    buildNumber: '1',
  },
  android: {
    package: clientConfig.packageName,
    versionCode: 1,
    googleServicesFile: './google-services.json',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: clientConfig.colors.background,
    },
    permissions: [
      'INTERNET',
      'ACCESS_NETWORK_STATE',
      'POST_NOTIFICATIONS',
      'VIBRATE',
    ],
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-video',
  ],
  extra: {
    clientConfig,
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
});
