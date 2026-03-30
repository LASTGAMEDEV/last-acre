const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Zustand (and other ESM-only packages) ship .mjs files that use import.meta,
// which crashes when Metro bundles them as a classic script for web.
// Disabling package exports forces Metro to use the CJS build via the "main" field.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
