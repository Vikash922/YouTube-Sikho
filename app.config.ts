import { ExpoConfig, ConfigContext } from 'expo/config';
import { clientConfig } from './src/config/client.config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: clientConfig.appName,
  slug: clientConfig.slug,
  version: clientConfig.version,
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
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
  },
  android: {
    package: clientConfig.packageName,
    permissions: [
      'INTERNET',
      'ACCESS_NETWORK_STATE',
      'RECEIVE_BOOT_COMPLETED',
      'VIBRATE',
    ],
  },
  plugins: [
    'expo-router',
    'expo-font',
  ],
  extra: {
    clientConfig,
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
});
