import {fetch} from 'undici';
import {readGames, writeGames} from './data-store.mjs';

const userAgent = 'Mozilla/5.0 (compatible; GamePlaybookResearch/1.0)';
const platforms = [
  {slug: 'pc', label: 'PC'},
  {slug: 'nintendo-switch', label: 'Nintendo Switch'},
  {slug: 'nintendo-switch-2', label: 'Nintendo Switch 2'},
  {slug: 'game-boy-advance', label: 'Game Boy Advance'},
  {slug: 'nintendo-ds', label: 'Nintendo DS'},
  {slug: '3ds', label: '3DS'},
];

function decodeHtml(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

async function fetchPage(platform, page) {
  const url = `https://www.metacritic.com/browse/game/${platform.slug}/all/all-time/metascore/?page=${page}`;
  const response = await fetch(url, {headers: {'User-Agent': userAgent}});
  if (!response.ok) throw new Error(`Metacritic returned ${response.status} for ${url}`);
  return {url, html: await response.text()};
}

function parseGames(html, platform, page) {
  const results = [];
  const cardPattern = /<a[^>]+href="\/game\/([^"/]+)\/"[^>]*>([\s\S]*?)<\/a>/g;
  for (const match of html.matchAll(cardPattern)) {
    const [, slug, card] = match;
    const titleMatch = card.match(/data-title="([^"]+)"/);
    const scoreMatch = card.match(/aria-label="Metascore\s+(\d+)\s+out of 100"/);
    const hasMustPlay = /alt="must-play"/i.test(card);
    if (!titleMatch || !scoreMatch || !hasMustPlay) continue;
    const releaseMatch = card.match(/<span>([A-Z][a-z]{2})\s+\d{1,2},\s+(\d{4})<\/span>/);
    results.push({
      slug,
      title: decodeHtml(titleMatch[1]),
      platform: platform.label,
      metacritic_score: Number(scoreMatch[1]),
      must_play: true,
      release_year: releaseMatch?.[2] ? Number(releaseMatch[2]) : null,
      genre: '',
      metacritic_url: `https://www.metacritic.com/game/${slug}/`,
      page,
    });
  }
  return results;
}

const existing = await readGames();
const existingByTitlePlatform = new Map(existing.map((row) => [`${row.title}::${row.platform}`, row]));
const existingBySlug = new Map(existing.map((row) => [row.slug, row]));
const collected = [];

for (const platform of platforms) {
  for (let page = 1; page <= 20; page += 1) {
    const {url, html} = await fetchPage(platform, page);
    const games = parseGames(html, platform, page);
    if (games.length === 0 && page > 1) break;
    collected.push(...games);
    console.log(`${platform.label} page ${page}: ${games.length} Must-Play games (${url})`);
  }
}

const unique = new Map(collected.map((game) => [`${game.platform}:${game.slug}`, game]));
const rows = [...unique.values()].map((game) => {
  const old = existingByTitlePlatform.get(`${game.title}::${game.platform}`) ?? existingBySlug.get(game.slug) ?? {};
  return {
    ...old,
    ...game,
    ign_score: old.ign_score ?? null,
    ign_url: old.ign_url ?? '',
    gamespot_score: old.gamespot_score ?? null,
    gamespot_url: old.gamespot_url ?? '',
    content_status: old.content_status || (old.ign_url || old.gamespot_url ? 'links-collected' : 'metacritic-must-play'),
    notes: old.notes || `Metacritic Must-Play；平台：${game.platform}；来源页第${game.page}页`,
  };
});

rows.sort((left, right) => left.platform.localeCompare(right.platform) || right.metacritic_score - left.metacritic_score || left.title.localeCompare(right.title));
await writeGames(rows);
console.log(`Wrote ${rows.length} Must-Play games to the JSON data layer`);
for (const platform of platforms) console.log(`${platform.label}: ${rows.filter((row) => row.platform === platform.label).length}`);
