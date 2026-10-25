const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add CJS support
if (!config.resolver.sourceExts.includes('cjs')) {
  config.resolver.sourceExts.push('cjs');
}

// Enable package exports (required for Expo SDK 58 and React Native 0.88 subpath exports)
config.resolver.unstable_enablePackageExports = true;

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
