module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // react-native-worklets/plugin must be listed last (Reanimated v4 / Skia
    // requirement) — see https://docs.swmansion.com/react-native-reanimated
    plugins: ["react-native-worklets/plugin"],
  };
};
