#!/bin/sh
# Xcode build phase on the widget extension target, added by plugins/withWidgetFetch.js.
# Bundles the props builder the extension evaluates in JavaScriptCore.
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd -P)"
cd "$PROJECT_ROOT"

if [ -f ios/.xcode.env ]; then . ios/.xcode.env; fi
if [ -f ios/.xcode.env.local ]; then . ios/.xcode.env.local; fi
NODE_BINARY="${NODE_BINARY:-node}"

DEST="$BUILT_PRODUCTS_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH"
mkdir -p "$DEST"

EXPO_OVERRIDE_METRO_CONFIG="$PROJECT_ROOT/widgets/fetch/metro.config.js" \
  "$NODE_BINARY" node_modules/expo/bin/cli export:embed \
  --platform ios \
  --dev false \
  --entry-file widgets/fetch/entry.ts \
  --bundle-output "$DEST/TracearrWidgetFetch.js" \
  --skip-server
