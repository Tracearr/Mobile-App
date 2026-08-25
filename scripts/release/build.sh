#!/usr/bin/env bash
# Local build entry point. Runs the same sequence as CI and EAS so the three
# surfaces produce matching results.
#
# The CLI version is pinned explicitly rather than using an ambient `eas`: a
# globally installed eas-cli lives under one node version's bin directory, so
# switching node silently changes the CLI. Keep this in step with
# `eas-version` in .github/workflows/mobile-release.yml. It is deliberately not
# a devDependency; expo-doctor fails the project when eas-cli is installed locally.
set -euo pipefail

EAS_CLI_VERSION="22.4.0"

TAG=""
PROFILE="auto"
PLATFORM="all"

while [ $# -gt 0 ]; do
  case "$1" in
    --tag) TAG="${2:-}"; shift 2 ;;
    --profile) PROFILE="${2:-}"; shift 2 ;;
    --platform) PLATFORM="${2:-}"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

if [ -z "$TAG" ]; then
  echo "usage: build.sh --tag <tag> [--profile auto|development|internal|beta|production] [--platform all|ios|android]" >&2
  exit 2
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

JSON=$(node scripts/release/tag-version.mjs "$TAG")
echo "$JSON"

if [ "$PROFILE" = "auto" ]; then
  PROFILE=$(echo "$JSON" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).defaultProfile))")
fi
echo "Profile: $PROFILE"

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is dirty. Commit or stash before building." >&2
  exit 1
fi

STARTING_REF=$(git rev-parse --abbrev-ref HEAD)
if [ "$STARTING_REF" = "HEAD" ]; then
  STARTING_REF=$(git rev-parse HEAD)
fi

cleanup() {
  git checkout -- app.json 2>/dev/null || true
  git checkout "$STARTING_REF" 2>/dev/null || true
}
trap cleanup EXIT

git checkout "$TAG"
pnpm install --frozen-lockfile
node scripts/release/verify-pins.mjs "$TAG"
node scripts/release/apply-version.mjs "$TAG"

pnpm dlx "eas-cli@${EAS_CLI_VERSION}" build \
  --platform "$PLATFORM" \
  --profile "$PROFILE" \
  --local \
  --non-interactive
