module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 worklets plugin. Must be listed last.
    plugins: ['react-native-worklets/plugin'],
  };
};
