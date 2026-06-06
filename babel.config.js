module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 3 plugin (SDK 54). Must be listed last.
    plugins: ['react-native-reanimated/plugin'],
  };
};
