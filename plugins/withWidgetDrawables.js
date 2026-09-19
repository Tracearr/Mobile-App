const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { withDangerousMod } = require('expo/config-plugins');

/**
 * Writes the Android home screen widget's drawables: the app's Lucide icons as
 * vector drawables, plus the rounded shapes and dark card gradient Glance cannot
 * draw itself. The widget tints them at render time.
 */

// Drawable name suffix -> Lucide icon file, the same icons the app shows.
const ICONS = {
  tv: 'tv',
  zap: 'zap',
  cpu: 'cpu',
  monitor_play: 'monitor-play',
  play: 'play',
  pause: 'pause',
  triangle_alert: 'triangle-alert',
};

// Reads the icon's node list from the installed lucide-react-native, with
// createLucideIcon stubbed so React Native never loads in Node.
function lucideNodes(icon) {
  const file = require.resolve(`lucide-react-native/icons/${icon}`);
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
    module,
    exports: module.exports,
    require: () => (_name, nodes) => nodes,
  });
  return module.exports;
}

function rectPath({ x = 0, y = 0, width, height, rx = 0 }) {
  const [left, top, w, h, r] = [x, y, width, height, rx].map(Number);
  const right = left + w;
  const bottom = top + h;
  if (!r) return `M${left},${top}H${right}V${bottom}H${left}Z`;
  const arc = (toX, toY) => `A${r},${r} 0 0 1 ${toX},${toY}`;
  return [
    `M${left + r},${top}`,
    `H${right - r}`,
    arc(right, top + r),
    `V${bottom - r}`,
    arc(right - r, bottom),
    `H${left + r}`,
    arc(left, bottom - r),
    `V${top + r}`,
    arc(left + r, top),
    'Z',
  ].join('');
}

// Android's path parser misreads SVG's packed arc flags ("0 01.5.5"), so every
// number is written out with explicit separators.
function normalizePath(d) {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g);
  const out = [];
  let command = '';
  let index = 0;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (/[a-zA-Z]/.test(token)) {
      command = token;
      index = 0;
      out.push(token);
      continue;
    }
    const arcFlag = /a/i.test(command) && (index % 7 === 3 || index % 7 === 4);
    if (arcFlag && token.length > 1 && /^[01]/.test(token)) {
      out.push(token[0]);
      tokens.splice(i + 1, 0, token.slice(1));
    } else {
      out.push(token);
    }
    index++;
  }
  return out.join(' ');
}

function iconVector(icon) {
  const paths = lucideNodes(icon).map(([tag, attrs]) => {
    if (tag === 'path') return normalizePath(attrs.d);
    if (tag === 'rect') return normalizePath(rectPath(attrs));
    throw new Error(`withWidgetDrawables: <${tag}> in Lucide "${icon}" is not supported`);
  });
  return `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
${paths
  .map(
    (d) => `    <path
        android:pathData="${d}"
        android:fillColor="#00000000"
        android:strokeColor="#FFFFFFFF"
        android:strokeWidth="2"
        android:strokeLineCap="round"
        android:strokeLineJoin="round" />`
  )
  .join('\n')}
</vector>
`;
}

const roundedShape = (radius) => `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#FFFFFFFF" />
    <corners android:radius="${radius}dp" />
</shape>
`;

// Tokens from src/lib/theme.ts: colors.blue.core into colors.background.dark.
const CARD_DARK = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <gradient
        android:angle="315"
        android:startColor="#FF0B1A2E"
        android:centerColor="#FF09090B"
        android:endColor="#FF09090B" />
</shape>
`;

module.exports = function withWidgetDrawables(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const dir = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res/drawable');
      fs.mkdirSync(dir, { recursive: true });
      const files = {
        widget_tile: roundedShape(10),
        widget_tile_small: roundedShape(7),
        widget_card_dark: CARD_DARK,
      };
      for (const [name, icon] of Object.entries(ICONS)) {
        files[`widget_icon_${name}`] = iconVector(icon);
      }
      for (const [name, xml] of Object.entries(files)) {
        fs.writeFileSync(path.join(dir, `${name}.xml`), xml);
      }
      return config;
    },
  ]);
};
