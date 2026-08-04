const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo (include default watchFolders)
config.watchFolders = [...(config.watchFolders || []), monorepoRoot];

// 2. Let Metro know where to resolve packages from
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. i18next and react-i18next keep their instance in module scope, so the app
// and @tracearr/translations must land on the same copy. pnpm gives the
// translations package its own, built against the workspace react rather than
// the react Expo pins here, and metro resolves it from that package's source —
// so initReactI18next registered on one instance while useTranslation read the
// other and every string rendered as its raw key (NO_I18NEXT_INSTANCE).
// Neither package ships a react-native export condition, so pinning each
// specifier straight to the file node resolves from this app is safe.
// react is pinned for the same reason, preventively: pnpm gives translations
// its own copy (the workspace floats ahead of the version Expo pins here), and
// two reacts in one bundle is an invalid-hook-call crash.
const SINGLETON_MODULES = ['i18next', 'react-i18next', 'react'];
const singletonFiles = new Map();
const pinSingleton = (specifier) => {
  try {
    singletonFiles.set(specifier, require.resolve(specifier, { paths: [projectRoot] }));
  } catch {
    // Subpath not published by this version — leave it to normal resolution.
  }
};
for (const name of SINGLETON_MODULES) {
  const { exports: pkgExports } = require(`${name}/package.json`);
  pinSingleton(name);
  for (const key of Object.keys(pkgExports ?? {})) {
    if (key.startsWith('./') && key !== './package.json') {
      pinSingleton(`${name}/${key.slice(2)}`);
    }
  }
}

// 4. Handle .js imports that should resolve to .ts files (NodeNext compatibility)
// TypeScript with moduleResolution: NodeNext requires .js extensions in imports
// even for .ts source files. Metro needs help resolving these correctly.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const pinned = singletonFiles.get(moduleName);
  if (pinned) {
    return { type: 'sourceFile', filePath: pinned };
  }

  if (moduleName.startsWith('.') && moduleName.endsWith('.js')) {
    const tsModuleName = moduleName.replace(/\.js$/, '.ts');
    try {
      return context.resolveRequest(context, tsModuleName, platform);
    } catch {
      // Fall through to default resolution if .ts doesn't exist
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Worklets bundle mode (the SDK 57 Reanimated/Hermes memory workaround) is off,
// here and in babel.config.js. Its react-native shim ends in a bare
// require('react-native'), which react-native-css remaps straight back to the
// shim, so the two cycle through NativeModules until the stack blows and "main"
// never registers. Both wrapping orders cycle, so ordering is not a way out.
// Still unfixed in worklets 0.11.3 and in the 0.12 nightlies; the shim needs an
// internal sentinel specifier first. Tracked as reanimated#9817.
module.exports = withNativewind(config, { input: './global.css' });
