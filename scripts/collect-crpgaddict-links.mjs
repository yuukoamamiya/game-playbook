import {readGames, writeGames} from './data-store.mjs';
import {addSource} from './media-sources.mjs';

// The CRPG Addict feed was read end-to-end. Only this title had an exact,
// unambiguous match among the current catalogue; related essays and fuzzy
// franchise mentions are intentionally left out.
const confirmed = {
  'the-elder-scrolls-iv-oblivion': [
    'https://crpgaddict.blogspot.com/2011/03/game-1257-elder-scrolls-iv-oblivion.html',
  ],
};

const rows = await readGames();
let added = 0;
for (const row of rows) {
  for (const url of confirmed[row.slug] ?? []) {
    const before = row.sources?.length ?? 0;
    addSource(row, {site: 'crpgaddict', kind: 'review', language: 'en', score: null, url});
    if ((row.sources?.length ?? 0) > before) added += 1;
  }
}
await writeGames(rows);
console.log(JSON.stringify({media: 'crpgaddict', added, urls: Object.values(confirmed).flat().length}, null, 2));
