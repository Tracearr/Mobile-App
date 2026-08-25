// Writes the tag-derived marketing version into app.json before a build.
// appVersionSource is "remote", which governs buildNumber and versionCode only.
// The marketing version still comes from app config, so it has to be applied here.

import { readFileSync, writeFileSync } from 'node:fs';
import { parseTag } from './tag-version.mjs';

export function applyVersion(appJson, marketingVersion) {
  if (!appJson.expo) {
    throw new Error('app.json is missing an expo block');
  }
  return { ...appJson, expo: { ...appJson.expo, version: marketingVersion } };
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const tag = process.argv[2];
  const appPath = process.argv[3] ?? 'app.json';
  if (!tag) {
    console.error('usage: apply-version.mjs <tag> [app.json path]');
    process.exit(2);
  }
  const { marketingVersion } = parseTag(tag);
  const appJson = JSON.parse(readFileSync(appPath, 'utf8'));
  writeFileSync(appPath, `${JSON.stringify(applyVersion(appJson, marketingVersion), null, 2)}\n`);
  console.log(`Set expo.version to ${marketingVersion}`);
}
