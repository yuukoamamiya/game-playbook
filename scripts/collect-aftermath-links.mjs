import {readGames, writeGames} from './data-store.mjs';
import {addSource} from './media-sources.mjs';

// Reviewed article pages found through Aftermath's post sitemap. The site
// labels these as impressions or analysis, so no score is inferred.
const confirmed = {
  'blue-prince': [
    {kind: 'feature', url: 'https://aftermath.site/blue-prince-impressions-review'},
  ],
  'against-the-storm': [
    {kind: 'feature', url: 'https://aftermath.site/against-the-storm-is-a-really-good-city-builder'},
  ],
  balatro: [
    {kind: 'feature', url: 'https://aftermath.site/the-nerve-of-balatro-for-being-this-good'},
  ],
  celeste: [
    {kind: 'essay', url: 'https://aftermath.site/celeste-speedrun-gdq-any-history-of-speedrunning'},
  ],
};

const rows = await readGames();
let added = 0;
for (const row of rows) {
  for (const source of confirmed[row.slug] ?? []) {
    const before = row.sources?.length ?? 0;
    addSource(row, {site: 'aftermath', language: 'en', score: null, ...source});
    if ((row.sources?.length ?? 0) > before) added += 1;
  }
}
await writeGames(rows);
console.log(JSON.stringify({media: 'aftermath', added, urls: Object.values(confirmed).flat().length}, null, 2));
