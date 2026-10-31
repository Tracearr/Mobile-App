const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');
// The helper expo-widgets builds its own extension target with. Prebuild fails at this
// require if a version bump moves it.
const withTargetXcodeProject =
  require('expo-widgets/plugin/build/ios/xcode/withTargetXcodeProject').default;

const TARGET = 'NotificationService';
const SWIFT = 'NotificationService.swift';
const EMPTY_ENTITLEMENTS = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict/>
</plist>
`;

function withSources(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const dir = path.join(config.modRequest.platformProjectRoot, TARGET);
      fs.mkdirSync(dir, { recursive: true });
      for (const file of [SWIFT, 'Info.plist']) {
        fs.copyFileSync(path.join(__dirname, 'notification-service', file), path.join(dir, file));
      }
      fs.writeFileSync(path.join(dir, `${TARGET}.entitlements`), EMPTY_ENTITLEMENTS);
      return config;
    },
  ]);
}

// EAS reads this list to register the bundle id and make a profile for it before prebuild runs.
function withEasExtension(config, bundleIdentifier) {
  const ios = config.extra?.eas?.build?.experimental?.ios ?? {};
  const appExtensions = (ios.appExtensions ?? []).filter((ext) => ext.targetName !== TARGET);
  appExtensions.push({ targetName: TARGET, bundleIdentifier, entitlements: {} });
  config.extra = {
    ...config.extra,
    eas: {
      ...config.extra?.eas,
      build: {
        ...config.extra?.eas?.build,
        experimental: { ...config.extra?.eas?.build?.experimental, ios: { ...ios, appExtensions } },
      },
    },
  };
  return config;
}

module.exports = (config, { bundleIdentifier, deploymentTarget }) => {
  const targetDir = path.join(config._internal.projectRoot, 'ios', TARGET);
  config = withEasExtension(config, bundleIdentifier);
  config = withSources(config);
  return withTargetXcodeProject(config, {
    targetName: TARGET,
    bundleIdentifier,
    deploymentTarget,
    // Info.plist stays out of the group: the xcode package would reuse the widget's
    // reference to a file of the same name and Xcode reports the project as malformed.
    getFileUris: () => [path.join(targetDir, SWIFT)],
  });
};
