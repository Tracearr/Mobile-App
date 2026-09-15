import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { playListings } from './sync-play-listing.mjs';

function listingsDir(listing) {
  const dir = mkdtempSync(path.join(tmpdir(), 'listings-'));
  writeFileSync(path.join(dir, 'de-DE.json'), JSON.stringify(listing));
  return dir;
}

const listing = {
  title: 'Tracearr',
  description: 'Beschreibung',
  apple: { locale: 'de-DE', subtitle: 'Untertitel', keywords: ['homelab'] },
  play: { language: 'de-DE', shortDescription: 'Kurz' },
};

test('maps a listing file to the Play listing body', () => {
  assert.deepEqual(playListings(listingsDir(listing)), [
    {
      language: 'de-DE',
      title: 'Tracearr',
      shortDescription: 'Kurz',
      fullDescription: 'Beschreibung',
    },
  ]);
});

test('refuses text over the Play limits before any request', () => {
  const long = { ...listing, play: { ...listing.play, shortDescription: 'ü'.repeat(81) } };
  assert.throws(() => playListings(listingsDir(long)), /shortDescription is 81 characters/);
});
