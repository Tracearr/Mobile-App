// Every version value a build needs, derived from one release tag.
// Local builds, CI, and EAS workflows all call this so they cannot drift apart.
//
// Two shapes share the parser. App tags are YYYY.M.N (major 2026 or later, no
// leading zero on the month) and are the only tags the tag workflow creates.
// Legacy tags mirror old server versions (v2.x.y) and stay parseable so those
// builds can be reproduced.

// The leading v is optional on input and always present on output, so passing
// either "2026.9.1" or "v2026.9.1" resolves to the same git tag.
const TAG_RE = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?$/;

const APP_SCHEME_FROM_MAJOR = 2026;

export function parseTag(tag) {
  const match = TAG_RE.exec(tag);
  if (!match) {
    throw new Error(`Not a Tracearr release tag: ${tag}`);
  }
  const [, major, minor, patch, prerelease] = match;
  const marketingVersion = `${major}.${minor}.${patch}`;
  const packageVersion = prerelease ? `${marketingVersion}-${prerelease}` : marketingVersion;
  return {
    tag: `v${packageVersion}`,
    marketingVersion,
    packageVersion,
    isPrerelease: Boolean(prerelease),
    defaultProfile: prerelease ? 'beta' : 'production',
    npmDistTag: prerelease ? 'next' : 'latest',
    scheme: Number(major) >= APP_SCHEME_FROM_MAJOR ? 'app' : 'legacy',
  };
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const tag = process.argv[2];
  if (!tag) {
    console.error('usage: tag-version.mjs <tag>');
    process.exit(2);
  }
  try {
    console.log(JSON.stringify(parseTag(tag)));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
