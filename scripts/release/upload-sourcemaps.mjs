// Uploads an OTA export's Hermes source maps to PostHog with the release the
// exceptions will carry. In posthog-cli's default event release mode an
// exception resolves its release from the $app_namespace and $app_version the
// SDK sends: the platform's application id and the store's marketing version.
// An OTA runs on every finished build of its runtime, so each store version on
// that runtime gets an upload of the same maps (the CLI overwrites in event
// mode), and --build stays out because a build number would name one of them.
//
// usage: upload-sourcemaps.mjs [update.json] with CHANNEL in the environment,
// where update.json is what `eas update --json` printed.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export function releaseName(appJson, platform) {
  return platform === 'ios' ? appJson.expo.ios.bundleIdentifier : appJson.expo.android.package;
}

export function planUploads(updates, appJson, finishedBuilds) {
  const seen = new Set();
  const uploads = [];
  for (const { platform, runtimeVersion } of updates) {
    const key = `${platform}:${runtimeVersion}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const versions = new Set(finishedBuilds(platform, runtimeVersion).map((b) => b.appVersion));
    for (const version of versions) {
      uploads.push({
        directory: `dist/_expo/static/js/${platform}`,
        name: releaseName(appJson, platform),
        version,
      });
    }
  }
  return uploads;
}

function easFinishedBuilds(channel) {
  return (platform, runtimeVersion) =>
    JSON.parse(
      execFileSync(
        'eas',
        [
          'build:list',
          '--channel',
          channel,
          '--platform',
          platform,
          '--status',
          'finished',
          '--runtime-version',
          runtimeVersion,
          '--limit',
          '50',
          '--json',
          '--non-interactive',
        ],
        { encoding: 'utf8' }
      )
    );
}

function main() {
  const updates = JSON.parse(readFileSync(process.argv[2] ?? 'update.json', 'utf8'));
  const appJson = JSON.parse(readFileSync('app.json', 'utf8'));
  const channel = process.env.CHANNEL ?? 'production';
  const uploads = planUploads(updates, appJson, easFinishedBuilds(channel));
  if (uploads.length === 0) {
    console.error('No finished build runs these updates; nothing to upload.');
    process.exit(1);
  }
  for (const { directory, name, version } of uploads) {
    console.log(`Uploading ${directory} as ${name}@${version}`);
    execFileSync(
      'pnpm',
      [
        'exec',
        'posthog-cli',
        'hermes',
        'upload',
        '--directory',
        directory,
        '--release-name',
        name,
        '--release-version',
        version,
      ],
      { stdio: 'inherit' }
    );
  }
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main();
}
