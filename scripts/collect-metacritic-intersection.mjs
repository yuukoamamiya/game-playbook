import fs from 'node:fs/promises';

const outputPath = new URL('../data/metacritic-games.csv', import.meta.url);
const userAgent = 'Mozilla/5.0 (compatible; GamePlaybookResearch/1.0)';
const platforms = [
  { slug: 'pc', label: 'PC' },
  { slug: 'nintendo-switch', label: 'Nintendo Switch' },
  { slug: 'nintendo-switch-2', label: 'Nintendo Switch 2' },
];
const header = [
  'slug', 'title', 'platform', 'metacritic_score', 'must_play', 'release_year',
  'genre', 'metacritic_url', 'ign_score', 'ign_url', 'gamespot_score',
  'gamespot_url', 'content_status', 'notes',
];

function decodeHtml(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

function parseCsvLine(line) {
  const values = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"' && quoted) {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(value);
      value = '';
    } else {
      value += char;
    }
  }
  values.push(value);
  return values;
}

function csvCell(value) {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function parseExistingRows(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return new Map();
  const fields = parseCsvLine(lines[0]);
  return new Map(lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return [values[0], Object.fromEntries(fields.map((field, index) => [field, values[index] ?? '']))];
  }));
}

async function fetchPage(platform, page) {
  const url = `https://www.metacritic.com/browse/game/${platform.slug}/all/all-time/metascore/?page=${page}`;
  const response = await fetch(url, { headers: { 'User-Agent': userAgent } });
  if (!response.ok) throw new Error(`Metacritic returned ${response.status} for ${url}`);
  return { url, html: await response.text() };
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
    const score = Number(scoreMatch[1]);
    if (score < 90) continue;
    const releaseMatch = card.match(/<span>([A-Z][a-z]{2})\s+\d{1,2},\s+(\d{4})<\/span>/);
    results.push({
      slug,
      title: decodeHtml(titleMatch[1]),
      platform: platform.label,
      metacritic_score: score,
      must_play: 'true',
      release_year: releaseMatch?.[2] ?? '',
      genre: '',
      metacritic_url: `https://www.metacritic.com/game/${slug}/`,
      page,
    });
  }
  return results;
}

const existing = parseExistingRows(await fs.readFile(outputPath, 'utf8'));
const existingByTitlePlatform = new Map(
  [...existing.values()].map((row) => [`${row.title}::${row.platform}`, row]),
);
const collected = [];

for (const platform of platforms) {
  for (let page = 1; page <= 20; page += 1) {
    const { url, html } = await fetchPage(platform, page);
    const games = parseGames(html, platform, page);
    if (games.length === 0 && page > 1) break;
    collected.push(...games);
    console.log(`${platform.label} page ${page}: ${games.length} matching games (${url})`);
  }
}

const unique = new Map(collected.map((game) => [`${game.platform}:${game.slug}`, game]));
const rows = [...unique.values()].map((game) => {
  const old = existingByTitlePlatform.get(`${game.title}::${game.platform}`) ?? existing.get(game.slug);
  const row = {
    ...game,
    ign_score: old?.ign_score ?? '',
    ign_url: old?.ign_url ?? '',
    gamespot_score: old?.gamespot_score ?? '',
    gamespot_url: old?.gamespot_url ?? '',
    content_status: old?.content_status || (old?.ign_url || old?.gamespot_url ? 'links-collected' : 'metacritic-filtered'),
    notes: old?.notes || `Metacritic高分（≥90）与Must-Play交集；来源页第${game.page}页`,
  };
  return row;
});

rows.sort((left, right) => left.platform.localeCompare(right.platform) || right.metacritic_score - left.metacritic_score || left.title.localeCompare(right.title));
const csv = [
  header.join(','),
  ...rows.map((row) => header.map((field) => csvCell(row[field])).join(',')),
  '',
].join('\n');
await fs.writeFile(outputPath, csv, 'utf8');
console.log(`Wrote ${rows.length} games to ${outputPath.pathname}`);
for (const platform of platforms) {
  console.log(`${platform.label}: ${rows.filter((row) => row.platform === platform.label).length}`);
}
