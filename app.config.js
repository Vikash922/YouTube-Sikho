// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
const { clientConfig } = require('./scripts/load-client-config');

const clientGoogleServices = `./clients/${clientConfig.slug}/google-services.json`;
const googleServicesFile = fs.existsSync(clientGoogleServices) ? clientGoogleServices : './google-services.json';

module.exports = ({ config }) => ({
  ...config,
  name: clientConfig.appName,
  slug: clientConfig.slug,
  owner: 'vikash0873',
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
    googleServicesFile,
    allowBackup: false,
    usesCleartextTraffic: false,
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
      projectId: 'ce01a15b-cdd1-406d-98ce-5beee1810f91',
    },
    router: {
      asyncRoutes: {
        web: true,
      },
    },
  },
});
