// Servers update lazily, so 2.2-only screens are gated on the version the server reports.
const RE = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/;

type Parsed = { core: [number, number, number]; pre: string[] | null };

function parse(v: string): Parsed | null {
  const m = RE.exec(v);
  if (!m) return null;
  return {
    core: [Number(m[1]), Number(m[2]), Number(m[3])],
    pre: m[4] ? m[4].split('.') : null,
  };
}

function cmpIdent(a: string, b: string): number {
  const na = /^\d+$/.test(a);
  const nb = /^\d+$/.test(b);
  if (na && nb) return Math.sign(Number(a) - Number(b));
  if (na) return -1;
  if (nb) return 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const pa = parse(a);
  const pb = parse(b);
  if (!pa || !pb) throw new Error(`Not a version: ${!pa ? a : b}`);
  for (let i = 0; i < 3; i++) {
    if (pa.core[i] !== pb.core[i]) return pa.core[i] > pb.core[i] ? 1 : -1;
  }
  if (!pa.pre && !pb.pre) return 0;
  if (!pa.pre) return 1;
  if (!pb.pre) return -1;
  const n = Math.max(pa.pre.length, pb.pre.length);
  for (let i = 0; i < n; i++) {
    const ia = pa.pre[i];
    const ib = pb.pre[i];
    if (ia === undefined) return -1;
    if (ib === undefined) return 1;
    const c = cmpIdent(ia, ib);
    if (c !== 0) return c > 0 ? 1 : -1;
  }
  return 0;
}

export function atLeast(version: string | null | undefined, min: string): boolean {
  if (!version || !parse(version)) return false;
  return compareVersions(version, min) >= 0;
}

/** First Tracearr tag with the automations routes and the { data, meta } list shape. */
export const SERVER_2_2 = '2.2.0-beta.3';
