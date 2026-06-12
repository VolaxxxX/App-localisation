module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo (SDK 54) automatically wires up the react-native-worklets
    // / reanimated plugin, so it must NOT be added again here (a duplicate would
    // throw a Babel error).
    presets: ['babel-preset-expo'],
  };
};
