// Fails a build before it starts when the checked-out tag's committed
// @tracearr/* pins do not match the tag being built. Catches a mistagged or
// unsynced release in seconds instead of after a 60 minute native build.

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

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const tag = process.argv[2];
  const pkgPath = process.argv[3] ?? 'package.json';
  if (!tag) {
    console.error('usage: verify-pins.mjs <tag> [package.json path]');
    process.exit(2);
  }
  const { packageVersion } = parseTag(tag);
  const pkgJson = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const mismatches = findPinMismatches(pkgJson, packageVersion);
  if (mismatches.length > 0) {
    console.error(`Package pins do not match ${tag} (expected ${packageVersion}):`);
    for (const { name, actual } of mismatches) {
      console.error(`  ${name}: ${actual ?? '(missing)'}`);
    }
    console.error('Run the sync workflow for this tag before building.');
    process.exit(1);
  }
  console.log(`Package pins match ${tag} (${packageVersion})`);
}
