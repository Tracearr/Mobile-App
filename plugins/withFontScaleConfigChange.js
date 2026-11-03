const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

/**
 * Handles a system font-scale change in place. Without `fontScale` in
 * configChanges Android recreates MainActivity and expo-router rebuilds its
 * state from the launch URL, which drops every tab stack. React Native re-lays
 * out every surface on the change itself. `density` stays out: nothing re-lays
 * out for it, so recreation is the safer default there.
 */
module.exports = function withFontScaleConfigChange(config) {
  return withAndroidManifest(config, (config) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(config.modResults);
    const changes = activity.$['android:configChanges'] ?? '';
    if (!changes.split('|').includes('fontScale')) {
      activity.$['android:configChanges'] = changes ? `${changes}|fontScale` : 'fontScale';
    }
    return config;
  });
};
