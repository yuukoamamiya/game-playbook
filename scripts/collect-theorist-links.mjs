import {readGames, writeGames} from './data-store.mjs';
import {addSource} from './media-sources.mjs';

// Alexander R. Galloway's article was opened and checked directly. It names
// each of these games in its discussion, so the same cultural essay can be
// associated with all four records. No score is inferred.
const confirmed = {
  'grand-theft-auto-iv': [
    {
      kind: 'essay',
      url: 'https://www.jesperjuul.net/ludologist/2007/03/30/gta-iv-and-philip-glass/',
    },
  ],
  'sid-meiers-civilization-iii': [
    {kind: 'essay', url: 'https://www.radicalphilosophy.com/article/playing-the-code'},
  ],
  'sid-meiers-alpha-centauri': [
    {kind: 'essay', url: 'https://www.radicalphilosophy.com/article/playing-the-code'},
  ],
  'the-sims': [
    {kind: 'essay', url: 'https://www.radicalphilosophy.com/article/playing-the-code'},
  ],
  'unreal-tournament-1999': [
    {kind: 'essay', url: 'https://www.radicalphilosophy.com/article/playing-the-code'},
  ],
};

const rows = await readGames();
let added = 0;
for (const row of rows) {
  for (const source of confirmed[row.slug] ?? []) {
    const before = row.sources?.length ?? 0;
    const site = row.slug === 'grand-theft-auto-iv' ? 'jesperjuul' : 'radicalphilosophy';
    addSource(row, {site, language: 'en', score: null, ...source});
    if ((row.sources?.length ?? 0) > before) added += 1;
  }
}
await writeGames(rows);
console.log(JSON.stringify({media: 'theorists', added, urls: Object.values(confirmed).flat().length}, null, 2));
