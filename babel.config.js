/** @type {import('@babel/core').ConfigFunction} */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // O plugin do Reanimated deve ser o ÚLTIMO da lista
    plugins: ['react-native-reanimated/plugin'],
  };
};
