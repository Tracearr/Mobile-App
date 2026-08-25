// Pins the @tracearr/* dependencies to an exact version.
//
// Deliberately not `pnpm pkg set`: a scoped name contains @ and /, which pnpm
// parses as property-path syntax, and whether it tolerates that varies by pnpm
// version. Doing it here also means the package list lives in exactly one
// place, shared with verify-pins.mjs, so the pinner and the verifier cannot
// disagree about what to pin.

import { readFileSync, writeFileSync } from 'node:fs';
import { parseTag } from './tag-version.mjs';
import { TRACEARR_PACKAGES } from './verify-pins.mjs';

export function pinPackages(pkgJson, version) {
  const dependencies = { ...pkgJson.dependencies };
  for (const name of TRACEARR_PACKAGES) {
    dependencies[name] = version;
  }
  return { ...pkgJson, dependencies };
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const tag = process.argv[2];
  const pkgPath = process.argv[3] ?? 'package.json';
  if (!tag) {
    console.error('usage: pin-packages.mjs <tag> [package.json path]');
    process.exit(2);
  }
  const { packageVersion } = parseTag(tag);
  const pkgJson = JSON.parse(readFileSync(pkgPath, 'utf8'));
  writeFileSync(pkgPath, `${JSON.stringify(pinPackages(pkgJson, packageVersion), null, 2)}\n`);
  for (const name of TRACEARR_PACKAGES) {
    console.log(`Pinned ${name} to ${packageVersion}`);
  }
}
