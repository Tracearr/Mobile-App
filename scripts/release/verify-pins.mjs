// Fails a build before it starts when the committed @tracearr/* pins cannot
// back the tag being built. Catches an unsynced or half-synced main in seconds
// instead of after a 60 minute native build.
//
// The app is versioned on its own (YYYY.M.N) and the pins say which Tracearr
// release it was built against, so the tag's number tells this check nothing.
// The rule: both pins are the same exact version, npm has that version for
// both packages, and a production release (stable tag) sits on a stable pin.
// A beta tag may sit on a server prerelease.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseTag } from './tag-version.mjs';

export const TRACEARR_PACKAGES = ['@tracearr/shared', '@tracearr/translations'];

const EXACT_VERSION_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

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

function anchorVersion(pkgJson) {
  const dependencies = pkgJson.dependencies ?? {};
  for (const name of TRACEARR_PACKAGES) {
    const value = dependencies[name];
    if (typeof value === 'string' && EXACT_VERSION_RE.test(value)) return value;
  }
  return null;
}

export function verifyPins(pkgJson, tag, fetchVersions = npmVersions) {
  const { isPrerelease } = parseTag(tag);
  const pinned = anchorVersion(pkgJson);
  const mismatches = findPinMismatches(pkgJson, pinned);
  if (pinned === null || mismatches.length > 0) {
    return { expected: null, mismatches, reason: 'pins disagree' };
  }
  for (const name of TRACEARR_PACKAGES) {
    if (!fetchVersions(name).includes(pinned)) {
      return {
        expected: pinned,
        mismatches: [],
        reason: `pins are ${pinned}, which npm does not have for ${name}`,
      };
    }
  }
  if (!isPrerelease && pinned.includes('-')) {
    return {
      expected: pinned,
      mismatches: [],
      reason: `a production release needs a stable pin, main is pinned to ${pinned}; sync a stable Tracearr release first`,
    };
  }
  return { expected: pinned, mismatches: [], reason: null };
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const tag = process.argv[2];
  const pkgPath = process.argv[3] ?? 'package.json';
  if (!tag) {
    console.error('usage: verify-pins.mjs <tag> [package.json path]');
    process.exit(2);
  }
  const pkgJson = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const { expected, mismatches, reason } = verifyPins(pkgJson, tag);
  if (reason !== null) {
    console.error(`Package pins cannot back ${tag}: ${reason}`);
    for (const { name, actual } of mismatches) {
      console.error(`  ${name}: ${actual ?? '(missing)'}`);
    }
    process.exit(1);
  }
  console.log(`Package pins back ${tag} (${expected})`);
}
