// Every version value a build needs, derived from one Tracearr release tag.
// Local builds, CI, and EAS workflows all call this so they cannot drift apart.

// The leading v is optional on input and always present on output, so passing
// either "2.2.0-beta.3" or "v2.2.0-beta.3" resolves to the same git tag.
const TAG_RE = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

// A mobile hotfix rebuilds a server version the app already shipped on, so its
// tag is the base tag plus -mobile.<n>. The suffix is stripped before anything
// else is derived: the pins, the store version and the build profile all belong
// to the base tag, and only the git tag itself differs.
const MOBILE_SUFFIX_RE = /^(?:(.+)-)?mobile\.(?:[1-9]\d*)$/;
const MOBILE_TOKEN_RE = /(?:^|[.-])mobile(?:[.-]|$)/;

export function parseTag(tag) {
  const match = TAG_RE.exec(tag);
  if (!match) {
    throw new Error(`Not a Tracearr release tag: ${tag}`);
  }
  const [, major, minor, patch, prerelease] = match;
  const mobile = prerelease ? MOBILE_SUFFIX_RE.exec(prerelease) : null;
  const basePrerelease = mobile ? mobile[1] : prerelease;
  if (basePrerelease && MOBILE_TOKEN_RE.test(basePrerelease)) {
    throw new Error(`Not a mobile hotfix tag: ${tag} (expected one -mobile.<n> suffix, n from 1)`);
  }
  const marketingVersion = `${major}.${minor}.${patch}`;
  const packageVersion = basePrerelease ? `${marketingVersion}-${basePrerelease}` : marketingVersion;
  return {
    tag: prerelease ? `v${marketingVersion}-${prerelease}` : `v${marketingVersion}`,
    baseTag: `v${packageVersion}`,
    marketingVersion,
    packageVersion,
    isPrerelease: Boolean(basePrerelease),
    defaultProfile: basePrerelease ? 'beta' : 'production',
    npmDistTag: basePrerelease ? 'next' : 'latest',
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
