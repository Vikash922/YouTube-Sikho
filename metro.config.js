const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add CJS support
if (!config.resolver.sourceExts.includes('cjs')) {
  config.resolver.sourceExts.push('cjs');
}

// Enable package exports (required for Expo SDK 58 and React Native 0.88 subpath exports)
config.resolver.unstable_enablePackageExports = true;

// Resolve Firebase dual-package hazard: Force CJS bundles for @firebase core packages
// so that @firebase/auth (CommonJS in React Native) and ESM modules share the exact same
// ComponentContainer and _components registry in memory.
const firebaseAliases = {
  '@firebase/app': path.resolve(__dirname, 'node_modules/@firebase/app/dist/index.cjs.js'),
  '@firebase/component': path.resolve(__dirname, 'node_modules/@firebase/component/dist/index.cjs.js'),
  '@firebase/logger': path.resolve(__dirname, 'node_modules/@firebase/logger/dist/index.cjs.js'),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (firebaseAliases[moduleName]) {
    return {
      filePath: firebaseAliases[moduleName],
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Strictly block non-app subdirectories from Metro watcher to prevent ENOSPC watcher exhaustion
config.resolver.blockList = [
  new RegExp(`^${path.resolve(__dirname, 'admin')}/.*`),
  new RegExp(`^${path.resolve(__dirname, 'functions')}/.*`),
  new RegExp(`^${path.resolve(__dirname, 'gateway')}/.*`),
  new RegExp(`^${path.resolve(__dirname, '.git')}/.*`),
  new RegExp(`^${path.resolve(__dirname, '.expo')}/.*`),
  new RegExp(`^${path.resolve(__dirname, 'node_modules/@react-native/debugger-frontend')}/.*`),
  new RegExp(`^${path.resolve(__dirname, 'node_modules/chrome-devtools-frontend')}/.*`),
];

module.exports = config;
