const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

// Bundles widgets/fetch/entry.ts for the widget extension's JavaScriptCore
// context the way expo-widgets bundles its own runtime: no polyfills, nothing
// run before the entry, and no React Native.
const projectRoot = path.resolve(__dirname, '../..');
const config = getDefaultConfig(projectRoot);

const stubs = {
  '@tracearr/translations/mobile': path.join(__dirname, 'translations-stub.ts'),
  // Not in the package's exports map, so it is pinned to the file.
  '@tracearr/translations/formatting': path.join(
    projectRoot,
    'node_modules/@tracearr/translations/src/formatting.ts'
  ),
};

module.exports = {
  ...config,
  resolver: {
    ...config.resolver,
    resolveRequest(context, moduleName, platform) {
      if (moduleName === 'react-native' || moduleName.startsWith('react-native/')) {
        return { type: 'empty' };
      }
      if (stubs[moduleName]) {
        return { type: 'sourceFile', filePath: stubs[moduleName] };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
  serializer: {
    ...config.serializer,
    getModulesRunBeforeMainModule: () => [],
    getPolyfills: () => [],
  },
};
