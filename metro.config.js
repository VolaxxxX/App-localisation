const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Expo 54 enables package.json "exports" resolution (unstable_enablePackageExports)
// but does NOT include "react-native" in the condition names by default.
// Without it, @firebase/auth resolves to the browser CJS bundle instead of the
// React Native bundle. The RN bundle calls registerAuth("ReactNative")
// automatically — the browser bundle does not, causing the runtime error
// "Component auth has not been registered yet".
config.resolver.unstable_conditionNames = ['react-native', 'require', 'default'];

module.exports = config;
