// Pushes store/listings to the Google Play store listing. EAS Metadata only covers
// the App Store, so Play gets the same text through the Android Publisher API.
import { readFileSync, readdirSync } from 'node:fs';
import { createSign } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE = 'com.tracearr.mobile';
const LIMITS = { title: 30, shortDescription: 80, fullDescription: 4000 };
const RELEASE_NOTES_LIMIT = 500;

export function playListings(dir) {
  return readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => {
      const listing = JSON.parse(readFileSync(path.join(dir, file), 'utf8'));
      const body = {
        language: listing.play.language,
        title: listing.title,
        shortDescription: listing.play.shortDescription,
        fullDescription: listing.description,
      };
      for (const [field, max] of Object.entries(LIMITS)) {
        const length = [...body[field]].length;
        if (length > max) {
          throw new Error(`${file}: ${field} is ${length} characters, Play allows ${max}`);
        }
      }
      return body;
    });
}

export function playReleaseNotes(dir) {
  return readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => {
      const listing = JSON.parse(readFileSync(path.join(dir, file), 'utf8'));
      const text = listing.play.releaseNotes;
      const length = [...text].length;
      if (length > RELEASE_NOTES_LIMIT) {
        throw new Error(
          `${file}: play.releaseNotes is ${length} characters, Play allows ${RELEASE_NOTES_LIMIT}`
        );
      }
      return { language: listing.play.language, text };
    });
}

// The secret may hold the key file as raw JSON or base64.
function readServiceAccount(raw) {
  const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  return JSON.parse(text);
}

async function accessToken(key) {
  const b64url = (value) => Buffer.from(value).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(
    JSON.stringify({
      iss: key.client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 600,
    })
  )}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(key.private_key, 'base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
  });
  const { access_token: token, error_description: reason } = await res.json();
  if (!token) throw new Error(`Google token request failed: ${reason}`);
  return token;
}

// The release named after the version only exists once EAS has submitted the
// build, so a push that runs before that leaves the notes for the next run.
async function setReleaseNotes(api, editId, version, releaseNotes) {
  const track = await api('GET', `/${editId}/tracks/production`);
  const release = track.releases?.find((r) => r.name === version);
  if (!release) {
    console.log(`No production release named ${version} yet, release notes not set`);
    return;
  }
  release.releaseNotes = releaseNotes;
  await api('PUT', `/${editId}/tracks/production`, track);
  console.log(`Set release notes on ${version} (${release.status})`);
}

async function sync(listings, key, version, releaseNotes) {
  const token = await accessToken(key);
  const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}/edits`;
  const api = async (method, route = '', body) => {
    const init = {
      method,
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    };
    if (body) init.body = JSON.stringify(body);
    const res = await fetch(`${base}${route}`, init);
    const json = res.status === 204 ? null : await res.json();
    if (!res.ok)
      throw new Error(`${method} ${route || '/'} -> ${res.status} ${JSON.stringify(json)}`);
    return json;
  };

  const edit = await api('POST');
  let committed = false;
  try {
    for (const listing of listings) {
      await api('PUT', `/${edit.id}/listings/${listing.language}`, listing);
      console.log(`Updated ${listing.language}`);
    }
    if (version) await setReleaseNotes(api, edit.id, version, releaseNotes);
    await api('POST', `/${edit.id}:commit`);
    committed = true;
    console.log('Committed the Play listing edit');
  } finally {
    if (!committed) await api('DELETE', `/${edit.id}`).catch(() => {});
  }
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    console.error('GOOGLE_SERVICE_ACCOUNT_KEY is not set');
    process.exit(2);
  }
  const dir = fileURLToPath(new URL('../../store/listings', import.meta.url));
  try {
    await sync(
      playListings(dir),
      readServiceAccount(raw),
      process.env.APP_VERSION,
      playReleaseNotes(dir)
    );
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
