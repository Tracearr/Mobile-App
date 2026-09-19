// Fails a build before it starts when the checked-out tag's committed
// @tracearr/* pins do not match the tag being built. Catches a mistagged or
// unsynced release in seconds instead of after a 60 minute native build.
//
// A stable tag whose version the server never published is a mobile-only
// release (a native hotfix such as 2.4.1 on top of server 2.4.0). Its pins must
// sit on the newest published stable release of the same major.minor instead.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseTag } from './tag-version.mjs';

export const TRACEARR_PACKAGES = ['@tracearr/shared', '@tracearr/translations'];

export function findPinMismatches(pkgJson, expectedVersion) {
  const dependencies = pkgJson.dependencies ?? {};
  const mismatches = [];
  for (const name of TRACEARR_PACKAGES) {
    const actual = Object.hasOwn(dependencies, name) ? dependencies[name] : null;
    if (actual !== expectedVersion) {
      mismatches.push({ name, expected: expectedVersion, actual });
    }
  }
  return mismatches;
}

export function npmVersions(name) {
  const versions = JSON.parse(
    execFileSync('npm', ['view', name, 'versions', '--json'], { encoding: 'utf8' })
  );
  return Array.isArray(versions) ? versions : [versions];
}

// Returns the version the pins must be on, or null when the server published a
// release for the tag or none exists for its major.minor.
export function mobileOnlyPinVersion(tag, publishedVersions) {
  const { packageVersion, isPrerelease } = parseTag(tag);
  if (isPrerelease || publishedVersions.includes(packageVersion)) {
    return null;
  }
  const [major, minor] = packageVersion.split('.');
  const patch = (version) => Number(version.split('.')[2]);
  const sameLine = publishedVersions
    .filter((version) => /^\d+\.\d+\.\d+$/.test(version))
    .filter((version) => version.startsWith(`${major}.${minor}.`))
    .sort((a, b) => patch(b) - patch(a));
  return sameLine[0] ?? null;
}

export function verifyPins(pkgJson, tag, fetchVersions = npmVersions) {
  const { packageVersion } = parseTag(tag);
  const mismatches = findPinMismatches(pkgJson, packageVersion);
  if (mismatches.length === 0) {
    return { expected: packageVersion, mismatches };
  }
  const mobileOnly = mobileOnlyPinVersion(tag, fetchVersions(TRACEARR_PACKAGES[0]));
  if (mobileOnly === null) {
    return { expected: packageVersion, mismatches };
  }
  return { expected: mobileOnly, mismatches: findPinMismatches(pkgJson, mobileOnly) };
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const tag = process.argv[2];
  const pkgPath = process.argv[3] ?? 'package.json';
  if (!tag) {
    console.error('usage: verify-pins.mjs <tag> [package.json path]');
    process.exit(2);
  }
  const pkgJson = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const { expected, mismatches } = verifyPins(pkgJson, tag);
  if (mismatches.length > 0) {
    console.error(`Package pins do not match ${tag} (expected ${expected}):`);
    for (const { name, actual } of mismatches) {
      console.error(`  ${name}: ${actual ?? '(missing)'}`);
    }
    console.error('Run the sync workflow for this tag before building.');
    process.exit(1);
  }
  console.log(`Package pins match ${tag} (${expected})`);
}
