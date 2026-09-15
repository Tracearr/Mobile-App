// EAS Metadata reads this through metadataPath in eas.json. Listing text lives in
// store/listings so the Play sync reads the same files, and the review notes come
// from the environment because they hold a live server token and the repo is public.
const fs = require('node:fs');
const path = require('node:path');
const config = require('./store.config.json');

const notes = process.env.APPLE_REVIEW_NOTES;
if (!notes) {
  throw new Error('Set APPLE_REVIEW_NOTES to the App Review notes (demo server URL and token)');
}

const { screenshots, ...urls } = config.apple.info['en-US'];
const listingsDir = path.join(__dirname, 'store', 'listings');
const info = {};
for (const file of fs.readdirSync(listingsDir).filter((name) => name.endsWith('.json'))) {
  const listing = JSON.parse(fs.readFileSync(path.join(listingsDir, file), 'utf8'));
  info[listing.apple.locale] = {
    ...urls,
    title: listing.title,
    subtitle: listing.apple.subtitle,
    keywords: listing.apple.keywords,
    description: listing.description,
    ...(listing.releaseNotes && { releaseNotes: listing.releaseNotes }),
    ...(listing.apple.locale === 'en-US' && { screenshots }),
  };
}

module.exports = {
  ...config,
  apple: {
    ...config.apple,
    ...(process.env.APP_VERSION && { version: process.env.APP_VERSION }),
    info,
    review: { ...config.apple.review, notes },
  },
};
