import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {readGames, writeGames} from './data-store.mjs';
import {addSource, hasSource} from './media-sources.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = resolve(tmpdir(), 'ign-sitemap-cache');
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const write = process.argv.includes('--write');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    const n = text[i + 1];
    if (c === '"' && quoted && n === '"') { value += '"'; i += 1; }
    else if (c === '"') { quoted = !quoted; }
    else if (c === ',' && !quoted) { row.push(value); value = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && n === '\n') i += 1;
      row.push(value);
      if (row.some((x) => x !== '')) rows.push(row);
      row = []; value = '';
    } else { value += c; }
  }
  if (value || row.length) { row.push(value); if (row.some((x) => x !== '')) rows.push(row); }
  return rows;
}

function csvCell(value) {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const roman = /^(i|ii|iii|iv|v|vi|vii|viii|ix|x|\d+)$/;
const stop = new Set(['the', 'and', 'of', 'for', 'with', 'to', 'in', 'on', 'edition', 'definitive', 'remastered', 'complete', 'goty', 'game', 'year', 'a', 'an', 's', 'x']);
const allowExtra = new Set(['article', 'articles', 'review', 'reviews', 'full', 'uk', 'au', 've', 'aussie', 'us', 'eu', 'hd', 'remastered', 'definitive', 'edition', 'goty', 'complete', 'pc', 'switch', 'xbox', 'ps4', 'ps5', 'series', 'new', 'updated', 'final', 'early', 'access', 'beta', 'launch', 'day', 'progress', 'impressions', 'plus', 'dlc', 'ffxiv', 'ex']);
const romanMap = {i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8', ix: '9', x: '10'};

function stem(token) {
  return token.length > 4 && token.endsWith('s') && !token.endsWith('ss') ? token.slice(0, -1) : token;
}

function normalizeToken(token) {
  const stemmed = stem(token);
  return romanMap[stemmed] ?? stemmed;
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(normalizeToken)
    .filter((t) => (t.length >= 2 || /^\d+$/.test(t)) && !stop.has(t));
}

const negative = /\b(preview|previews|hands-on|impressions|news|guide|guides|walkthrough|trailer|video|feature|interview|tips|wiki|deal|deals|sale|release-date|patch|update|roundup|review-roundup|movie|film|tv|mod|ai-generated|rumor|leak|how-to|explained|everything|best|top|ranked|buying|preorder|reaction|opinion|editorial|column)\b/;

await mkdir(cacheDir, {recursive: true});
const indexXml = await (await fetch('https://www.ign.com/rss/sitemap-articles.xml', {headers: {'User-Agent': userAgent}})).text();
const yearMaps = [...indexXml.matchAll(/<loc>([^<]+sitemap-articles-(\d{4})\.xml)<\/loc>/g)].map((m) => ({url: m[1], year: m[2]}));

const corpus = [];
for (const {url, year} of yearMaps) {
  const cacheFile = resolve(cacheDir, `y${year}.xml`);
  let xml;
  try { xml = await readFile(cacheFile, 'utf8'); }
  catch { xml = await (await fetch(url, {headers: {'User-Agent': userAgent}})).text(); await writeFile(cacheFile, xml, 'utf8'); }
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const u = m[1].replace(/&amp;/g, '&');
    if (u.includes('/articles/')) corpus.push(u);
  }
}
console.error(`corpus: ${corpus.length} article urls`);

function pathTokens(url) {
  const path = url.toLowerCase().replace(/^https?:\/\/[^/]+/, '').replace(/\/\d{4}\/\d{2}\/\d{2}\//, '/');
  return path.split(/[^a-z0-9]+/).filter(Boolean).map(normalizeToken);
}

function variants(title) {
  const full = tokenize(title);
  const out = [full];
  const drop = new Set(['sid', 'meier', 'meiers', 'tom', 'clancy', 'clancys', 'the']);
  let i = 0;
  while (i < full.length && drop.has(full[i])) i += 1;
  if (i > 0) out.push(full.slice(i));
  return out.filter((v) => v.length);
}

function candidates(title) {
  const vs = variants(title);
  const scored = [];
  for (const url of corpus) {
    const path = url.toLowerCase();
    if (!/(^|[-/])reviews?($|[-/])/.test(path)) continue;
    if (negative.test(path)) continue;
    const pt = pathTokens(url);
    const pset = new Set(pt);
    for (const v of vs) {
      if (!v.every((tok) => pset.has(tok))) continue;
      const extra = pt.filter((tok) => !v.includes(tok) && !allowExtra.has(tok) && !stop.has(tok));
      let score = v.length * 10 - extra.length * 12;
      if (extra.length === 0) score += 8;
      if (/-review$/.test(path.replace(/\/$/, ''))) score += 4;
      if (v !== vs[0]) score -= 2;
      scored.push({url, score, extra});
      break;
    }
  }
  const byUrl = new Map();
  for (const s of scored) if (!byUrl.has(s.url) || byUrl.get(s.url).score < s.score) byUrl.set(s.url, s);
  return [...byUrl.values()].sort((a, b) => b.score - a.score).slice(0, 3);
}

const rows = await readGames();

const report = [];
for (const row of rows) {
  if (hasSource(row, 'ign')) continue;
  const cand = candidates(row.title);
  report.push({slug: row.slug, title: row.title, cand});
}

let confident = 0;
let none = 0;
for (const r of report) {
  const best = r.cand[0];
  const good = best && best.extra.length === 0 && best.score >= 15;
  if (good) confident += 1; else if (!best) none += 1;
  console.log(`${good ? 'GOOD' : best ? 'CHECK' : 'MISS '} ${r.slug} | ${r.title}`);
  for (const c of r.cand) console.log(`      [${c.score}] ${c.url}${c.extra.length ? '  extra:' + c.extra.join(',') : ''}`);
}
console.error(`\nmissing ${report.length} | confident ${confident} | no-candidate ${none}`);

if (write) {
  const exclude = new Set(['bayonetta-plus-bayonetta-2']);
  const overrides = {
    'age-of-empires-ii-the-age-of-kings': 'https://www.ign.com/articles/1999/10/09/age-of-empires-ii-the-age-of-kings',
    'warcraft-iii-reign-of-chaos': 'https://www.ign.com/articles/2001/12/06/warcraft-iii-reign-of-chaos-3',
    'thief-the-dark-project': 'https://www.ign.com/articles/1998/12/12/thief-the-dark-project',
    'final-fantasy-xiv-shadowbringers': 'https://www.ign.com/articles/2019/07/12/ffxiv-shadowbringers-review',
    'overwatch-2016': 'https://www.ign.com/articles/2016/05/28/overwatch-review',
    'grand-theft-auto-iii': 'https://www.ign.com/articles/grand-theft-auto-iii-the-legacy-review',
  };
  let filled = 0;
  for (const row of rows) {
    if (hasSource(row, 'ign')) continue;
    const slug = row.slug;
    if (exclude.has(slug)) continue;
    if (overrides[slug]) { addSource(row, {site: 'ign', kind: 'review', language: 'en', score: null, url: overrides[slug]}); filled += 1; continue; }
    const best = candidates(row.title)[0];
    if (best && best.extra.length === 0 && best.score >= 15) { addSource(row, {site: 'ign', kind: 'review', language: 'en', score: null, url: best.url}); filled += 1; }
  }
  await writeGames(rows);
  console.error(`wrote IGN sources for ${filled} rows`);
}
