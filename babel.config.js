module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@': './src',
          },
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        },
      ],
      // bundleMode is off: its react-native shim and react-native-css both remap
      // the bare 'react-native' specifier, so each resolves to the other and the
      // app dies on startup in a NativeModules recursion. See reanimated#9817;
      // re-enable once the shim uses an internal sentinel specifier.
      'react-native-worklets/plugin',
    ],
  };
};
