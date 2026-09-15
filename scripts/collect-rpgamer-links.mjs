import {readGames, writeGames} from './data-store.mjs';
import {addSource} from './media-sources.mjs';

// These URLs were confirmed from RPGamer result pages. The site's sitemap
// contains malformed XML (an XML declaration is not at byte zero), so keep
// this as a reviewed checkpoint and use the WordPress search endpoint.
const confirmed = {
  'divinity-original-sin-ii': [
    'https://rpgamer.com/review/divinity-original-sin-ii-review/',
  ],
  'dragon-quest-xi-s-echoes-of-an-elusive-age': [
    'https://rpgamer.com/review/dragon-quest-xi-s-echoes-of-an-elusive-age-ps4-review/',
  ],
  'sea-of-stars': [
    'https://rpgamer.com/review/sea-of-stars-review/',
  ],
  'chrono-trigger': [
    'https://rpgamer.com/review/chrono-trigger-ds-review-3/',
  ],
  'chained-echoes': [
    'https://rpgamer.com/review/chained-echoes-review/',
  ],
  'the-elder-scrolls-iv-oblivion': [
    'https://rpgamer.com/review/the-elder-scrolls-iv-oblivion-review/',
    'https://rpgamer.com/review/the-elder-scrolls-iv-oblivion-retroview/',
  ],
  'persona-5-royal': [
    'https://rpgamer.com/2022/10/persona-5-royal-switch-impression/',
    'https://rpgamer.com/2020/06/jrpg-study-time-persona-5-royal-is-a-tower-of-mechanics-that-never-topples/',
  ],
  'fire-emblem-awakening': [
    'https://rpgamer.com/review/fire-emblem-awakening-review/',
  ],
  'disco-elysium': [
    'https://rpgamer.com/review/disco-elysium-review/',
  ],
  'dragon-age-origins': [
    'https://rpgamer.com/review/dragon-age-origins-review-pc/',
  ],
  'fallout-3': [
    'https://rpgamer.com/review/fallout-3-review-2/',
    'https://rpgamer.com/review/fallout-3-review/',
  ],
  'the-witcher-3-wild-hunt': [
    'https://rpgamer.com/review/the-witcher-3-wild-hunt-review/',
  ],
  'metaphor-refantazio': [
    'https://rpgamer.com/review/metaphor-refantazio-review/',
  ],
  'persona-4-golden': [
    'https://rpgamer.com/review/persona-4-golden-ps4-review/',
    'https://rpgamer.com/review/persona-4-golden-pc-review/',
    'https://rpgamer.com/review/persona-4-golden-review/',
  ],
};

const rows = await readGames();
let added = 0;
for (const row of rows) {
  for (const url of confirmed[row.slug] ?? []) {
    const before = row.sources?.length ?? 0;
    addSource(row, {site: 'rpgamer', kind: 'review', language: 'en', score: null, url});
    if ((row.sources?.length ?? 0) > before) added += 1;
  }
}
await writeGames(rows);
console.log(JSON.stringify({media: 'rpgamer', added, urls: Object.values(confirmed).flat().length}, null, 2));
