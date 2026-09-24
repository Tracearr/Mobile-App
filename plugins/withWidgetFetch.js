const fs = require('fs');
const path = require('path');
const { withDangerousMod, withXcodeProject, IOSConfig } = require('expo/config-plugins');
// pnpm keeps @expo/plist under expo, not at the app root.
const plist = require(
  require.resolve('@expo/plist', { paths: [require.resolve('expo/package.json')] })
).default;

/**
 * Makes the iOS Now Playing widget fetch its own data. expo-widgets rewrites
 * ios/ExpoWidgetsTarget on every prebuild, so this plugin is listed before it in
 * app.json (mods run last-registered first) and edits the generated files after
 * the generator wrote them.
 */

const TARGET = 'ExpoWidgetsTarget';
const SWIFT = 'NowPlayingFetch.swift';
const BUNDLE_PHASE = 'Bundle Tracearr widget fetch';

const ANCHOR = `  func timeline(for configuration: NowPlayingConfigurationAppIntent, in context: Context) async -> Timeline<NowPlayingTimelineEntry> {
    let entries = self.parseTimeline(configuration: configuration)
    let timeline = Timeline<NowPlayingTimelineEntry>(entries: entries, policy: .atEnd)
    return timeline
  }`;

const REPLACEMENT = `  func timeline(for configuration: NowPlayingConfigurationAppIntent, in context: Context) async -> Timeline<NowPlayingTimelineEntry> {
    let policy = await NowPlayingFetch.refresh()
    let entries = self.parseTimeline(configuration: configuration)
    return Timeline<NowPlayingTimelineEntry>(entries: entries, policy: policy)
  }`;

function withFetchSources(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const target = path.join(config.modRequest.platformProjectRoot, TARGET);
      const provider = path.join(target, 'NowPlaying.swift');
      const source = fs.readFileSync(provider, 'utf8');
      if (!source.includes(ANCHOR)) {
        throw new Error(
          `withWidgetFetch: ${provider} no longer contains the timeline(for:in:) this plugin rewrites; ` +
            'compare it with expo-widgets and update ANCHOR.'
        );
      }
      fs.writeFileSync(provider, source.replace(ANCHOR, REPLACEMENT));
      fs.copyFileSync(path.join(__dirname, 'widget-fetch', SWIFT), path.join(target, SWIFT));

      // The app allows http servers; the extension talks to the same server.
      const plistPath = path.join(target, 'Info.plist');
      const info = plist.parse(fs.readFileSync(plistPath, 'utf8'));
      info.NSAppTransportSecurity = { NSAllowsArbitraryLoads: true };
      fs.writeFileSync(plistPath, plist.build(info));
      return config;
    },
  ]);
}

function withFetchTarget(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const targets = project.pbxNativeTargetSection();
    const targetUuid = Object.keys(targets).find(
      (key) => !key.endsWith('_comment') && targets[key].name === TARGET
    );
    if (!targetUuid) {
      throw new Error(
        `withWidgetFetch: target ${TARGET} not found; is expo-widgets listed after this plugin?`
      );
    }
    // The path is relative to the group, whose own path is the target directory.
    IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
      filepath: SWIFT,
      groupName: TARGET,
      project,
      targetUuid,
    });
    const phases = project.hash.project.objects.PBXShellScriptBuildPhase ?? {};
    const exists = Object.values(phases).some(
      (phase) => phase && phase.name === `"${BUNDLE_PHASE}"`
    );
    if (!exists) {
      project.addBuildPhase([], 'PBXShellScriptBuildPhase', BUNDLE_PHASE, targetUuid, {
        shellPath: '/bin/sh',
        shellScript: '"$SRCROOT/../scripts/ios/bundle-widget-fetch.sh"',
      });
    }
    return config;
  });
}

module.exports = (config) => withFetchTarget(withFetchSources(config));
