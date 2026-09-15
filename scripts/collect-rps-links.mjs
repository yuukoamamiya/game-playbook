import {readGames, writeGames} from './data-store.mjs';
import {addSource} from './media-sources.mjs';

// Reviewed article pages found through Rock Paper Shotgun's yearly sitemaps.
// This is an additive, idempotent checkpoint; it does not scrape article text.
const confirmed = {
  hades: [
    {kind: 'review', url: 'https://www.rockpapershotgun.com/early-access-review-hades'},
  ],
  satisfactory: [
    {kind: 'review', url: 'https://www.rockpapershotgun.com/satisfactory-10-review'},
    {kind: 'review', url: 'https://www.rockpapershotgun.com/satisfactory-review-early-access'},
  ],
  'the-elder-scrolls-iv-oblivion': [
    {kind: 'essay', url: 'https://www.rockpapershotgun.com/have-you-played-the-elder-scrolls-iv-oblivion'},
    {kind: 'essay', url: 'https://www.rockpapershotgun.com/elder-scrolls-iv-oblivion-is-ten-years-old'},
  ],
  'the-stanley-parable-ultra-deluxe': [
    {kind: 'essay', url: 'https://www.rockpapershotgun.com/the-stanley-parable-ultra-deluxe-has-a-cursed-awareness-of-its-own-weird-culty-relevance'},
  ],
};

const rows = await readGames();
let added = 0;
for (const row of rows) {
  for (const source of confirmed[row.slug] ?? []) {
    const before = row.sources?.length ?? 0;
    addSource(row, {site: 'rockpapershotgun', language: 'en', score: null, ...source});
    if ((row.sources?.length ?? 0) > before) added += 1;
  }
}
await writeGames(rows);
console.log(JSON.stringify({media: 'rockpapershotgun', added, urls: Object.values(confirmed).flat().length}, null, 2));
