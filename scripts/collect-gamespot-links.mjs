import {readFile, writeFile, readdir} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const csvPath = resolve(root, 'data/metacritic-games.csv');
const corpusDir = resolve(tmpdir(), 'opencode');
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

const stop = new Set(['the', 'and', 'of', 'for', 'with', 'to', 'in', 'on', 'a', 'an', 's', 'x', 'game', 'year']);
const romanMap = {i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8', ix: '9', x: '10'};
function norm(t) { const s = t.length > 4 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t; return romanMap[s] ?? s; }
function tokenize(text) {
  return text.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').split(/\s+/).filter(Boolean).map(norm).filter((t) => (t.length >= 2 || /^\d+$/.test(t)) && !stop.has(t));
}

const corpus = [];
for (const f of await readdir(corpusDir)) {
  if (!/^gs-reviews-\d+\.txt$/.test(f)) continue;
  for (const line of (await readFile(resolve(corpusDir, f), 'utf8')).split('\n')) {
    const url = line.trim();
    const m = url.match(/^https:\/\/www\.gamespot\.com\/reviews\/([^/]+)\//);
    if (!m) continue;
    const slug = m[1];
    if (/^\d+$/.test(slug) || slug === 'reviews') continue;
    corpus.push({url, slug, tokens: tokenize(slug)});
  }
}
console.error(`corpus: ${corpus.length} gamespot reviews`);

function matchScore(titleTokens, slugTokens) {
  const ri = slugTokens.indexOf('review');
  const prefix = ri >= 0 ? slugTokens.slice(0, ri) : slugTokens;
  let ti = 0;
  let extras = 0;
  for (const t of prefix) {
    if (ti < titleTokens.length && t === titleTokens[ti]) ti += 1;
    else extras += 1;
  }
  if (ti < titleTokens.length) return null;
  return {score: extras * 100 + (prefix.length - titleTokens.length), extras, prefixLen: prefix.length};
}

function candidates(title) {
  const tt = tokenize(title);
  if (!tt.length) return [];
  const scored = [];
  for (const c of corpus) {
    const m = matchScore(tt, c.tokens);
    if (!m || m.extras > 2) continue;
    scored.push({...c, ...m, titleLen: tt.length});
  }
  scored.sort((a, b) => a.score - b.score || a.url.localeCompare(b.url));
  return scored.slice(0, 3);
}

const rows = parseCsv(await readFile(csvPath, 'utf8'));
const h = rows[0];
const si = h.indexOf('slug'), ti = h.indexOf('title'), gi = h.indexOf('gamespot_url');

const report = [];
for (const row of rows.slice(1)) {
  if (row[gi]) continue;
  report.push({slug: row[si], title: row[ti], cand: candidates(row[ti])});
}

let good = 0, miss = 0;
for (const r of report) {
  const best = r.cand[0];
  const ok = best && best.extras === 0 && best.prefixLen === best.titleLen;
  if (ok) good += 1; else if (!best) miss += 1;
  console.log(`${ok ? 'GOOD' : best ? 'CHECK' : 'MISS '} ${r.slug} | ${r.title}`);
  for (const c of r.cand) console.log(`      [${c.score}] ${c.url}`);
}
console.error(`\nmissing ${report.length} | good ${good} | none ${miss}`);

if (write) {
  const exclude = new Set(['bayonetta-plus-bayonetta-2']);
  const overrides = {
    'elden-ring-shadow-of-the-erdtree': 'https://www.gamespot.com/reviews/elden-ring-shadow-of-the-erdtree-dlc-review-kill-them-with-kindness/1900-6418243/',
    'galactic-civilizations-ii-twilight-of-the-arnor': 'https://www.gamespot.com/reviews/galactic-civilizations-ii-twilight-of-the-arnor-re/1900-6191779/',
    'no-one-lives-forever-2-a-spy-in-h-a-r-m-s-way': 'https://www.gamespot.com/reviews/no-one-lives-forever-2-a-spy-in-harms-way/1900-2881851/',
    'into-the-breach': 'https://www.gamespot.com/reviews/into-the-breach-advanced-edition-review-a-mechanized-masterpiece/1900-6416865/',
    'total-war-shogun-2': 'https://www.gamespot.com/reviews/shogun-2-total-war-review/1900-6304519/',
    'death-stranding-2-on-the-beach': 'https://www.gamespot.com/reviews/death-stranding-2-review-tied-up/1900-6418377/',
    'overwatch-2016': 'https://www.gamespot.com/reviews/overwatch-review/1900-6416439/',
    'sid-meiers-civilization-iii': 'https://www.gamespot.com/reviews/civilization-iii-review/1900-2821275/',
    'the-last-of-us-part-ii-remastered': 'https://www.gamespot.com/reviews/the-last-of-us-part-2-spoilerfree-review/1900-6417483/',
  };
  let filled = 0;
  for (const row of rows.slice(1)) {
    if (row[gi]) continue;
    const slug = row[si];
    if (exclude.has(slug)) continue;
    if (overrides[slug]) { row[gi] = overrides[slug]; filled += 1; continue; }
    const best = candidates(row[ti])[0];
    if (best && best.extras === 0 && best.prefixLen === best.titleLen) { row[gi] = best.url; filled += 1; }
  }
  await writeFile(csvPath, `${rows.map((r) => r.map(csvCell).join(',')).join('\n')}\n`, 'utf8');
  console.error(`wrote gamespot_url for ${filled} rows`);
}
