// Every version value a build needs, derived from one Tracearr release tag.
// Local builds, CI, and EAS workflows all call this so they cannot drift apart.

const TAG_RE = /^v(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

export function parseTag(tag) {
  const match = TAG_RE.exec(tag);
  if (!match) {
    throw new Error(`Not a Tracearr release tag: ${tag}`);
  }
  const [, major, minor, patch, prerelease] = match;
  const marketingVersion = `${major}.${minor}.${patch}`;
  return {
    tag,
    marketingVersion,
    packageVersion: prerelease ? `${marketingVersion}-${prerelease}` : marketingVersion,
    isPrerelease: Boolean(prerelease),
    defaultProfile: prerelease ? 'beta' : 'production',
    npmDistTag: prerelease ? 'next' : 'latest',
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
