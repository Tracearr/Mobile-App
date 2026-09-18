import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const dir = path.join(import.meta.dirname, '..', '..', 'store', 'listings');
const listings = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => [f, JSON.parse(readFileSync(path.join(dir, f), 'utf8'))]);

test('every listing fits the App Store and Play limits', () => {
  for (const [file, l] of listings) {
    assert.ok(l.title.length <= 30, `${file} title`);
    assert.ok(l.description.length <= 4000, `${file} description`);
    assert.ok((l.releaseNotes ?? '').length <= 4000, `${file} releaseNotes`);
    assert.ok(l.apple.subtitle.length <= 30, `${file} apple.subtitle`);
    assert.ok(l.apple.keywords.join(',').length <= 100, `${file} apple.keywords`);
    assert.ok(l.play.shortDescription.length <= 80, `${file} play.shortDescription`);
    assert.ok([...l.play.releaseNotes].length <= 500, `${file} play.releaseNotes`);
  }
});

// eas metadata:push logs this as an error but still exits 0, so a listing with
// "beta" in it silently skips the App Store push (2.4.0 shipped without notes).
test('no listing uses the word beta where eas metadata rejects it', () => {
  for (const [file, l] of listings) {
    const scanned = [l.title, l.apple.subtitle, l.description, l.apple.keywords.join(' ')];
    for (const text of scanned) {
      assert.ok(!/beta|bêta|ベータ/i.test(text), `${file} contains beta`);
    }
  }
});
