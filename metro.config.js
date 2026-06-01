const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Zustand (and other ESM-only packages) ship .mjs files that use import.meta,
// which crashes when Metro bundles them as a classic script for web.
// Disabling package exports forces Metro to use the CJS build via the "main" field.
config.resolver.unstable_enablePackageExports = false;

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    (
      moduleName === './handlers/NativeViewGestureHandler' ||
      moduleName === './NativeViewGestureHandler' ||
      moduleName === '../../NativeViewGestureHandler'
    ) &&
    context.originModulePath.includes(`react-native-gesture-handler${path.sep}lib${path.sep}`)
  ) {
    return {
      type: 'sourceFile',
      filePath: path.join(__dirname, 'shims/rngh/NativeViewGestureHandler.js'),
    };
  }

  if (
    moduleName === '../web_hammer/NativeViewGestureHandler' &&
    context.originModulePath.includes(`react-native-gesture-handler${path.sep}lib${path.sep}`)
  ) {
    return {
      type: 'sourceFile',
      filePath: path.join(__dirname, 'shims/rngh/NativeViewGestureHandler.js'),
    };
  }

  if (
    moduleName === './nativeGesture' &&
    context.originModulePath.includes(`react-native-gesture-handler${path.sep}lib${path.sep}`) &&
    context.originModulePath.includes(`${path.sep}handlers${path.sep}gestures`)
  ) {
    return {
      type: 'sourceFile',
      filePath: path.join(__dirname, 'shims/rngh/nativeGesture.js'),
    };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
