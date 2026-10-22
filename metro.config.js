const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Strictly anchor to the root admin and functions subdirectories so npm packages (like firebase/functions) are NEVER blocked!
config.resolver.blockList = [
  new RegExp(`^${path.resolve(__dirname, 'admin')}/.*`),
  new RegExp(`^${path.resolve(__dirname, 'functions')}/.*`),
  new RegExp(`^${path.resolve(__dirname, '.git')}/.*`),
];

module.exports = config;
