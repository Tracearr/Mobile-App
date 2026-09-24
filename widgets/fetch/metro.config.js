const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

// Bundles widgets/fetch/entry.ts for the widget extension's JavaScriptCore
// context the way expo-widgets bundles its own runtime: no polyfills, nothing
// run before the entry, and no React Native.
const projectRoot = path.resolve(__dirname, '../..');
const config = getDefaultConfig(projectRoot);

// The deep paths are not in either package's exports map, so they are pinned to files.
const stubs = {
  '@tracearr/translations/mobile': path.join(__dirname, 'translations-stub.ts'),
  '@tracearr/translations/formatting': path.join(
    projectRoot,
    'node_modules/@tracearr/translations/src/formatting.ts'
  ),
  '@tracearr/shared': path.join(__dirname, 'shared-stub.ts'),
  '@tracearr/shared/media': path.join(projectRoot, 'node_modules/@tracearr/shared/dist/media.js'),
  '@tracearr/shared/playbackDecision': path.join(
    projectRoot,
    'node_modules/@tracearr/shared/dist/playbackDecision.js'
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
