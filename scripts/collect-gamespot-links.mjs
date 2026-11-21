import {readFile, readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {readGames, writeGames} from './data-store.mjs';
import {addSource, hasSource} from './media-sources.mjs';
import {compareText, tokenize} from './lib/csv.mjs';

// Input: pre-downloaded GameSpot review URL lists in
// `%TEMP%/opencode/gs-reviews-<n>.txt` (one URL per line). This script only
// matches that corpus to the catalog; it does not fetch the sitemap itself.
// Pass --write to persist confident matches (and the reviewed overrides below).
const corpusDir = resolve(tmpdir(), 'opencode');
const write = process.argv.includes('--write');

const stop = new Set(['the', 'and', 'of', 'for', 'with', 'to', 'in', 'on', 'a', 'an', 's', 'x', 'game', 'year']);

const corpus = [];
for (const f of await readdir(corpusDir)) {
  if (!/^gs-reviews-\d+\.txt$/.test(f)) continue;
  for (const line of (await readFile(resolve(corpusDir, f), 'utf8')).split('\n')) {
    const url = line.trim();
    const m = url.match(/^https:\/\/www\.gamespot\.com\/reviews\/([^/]+)\//);
    if (!m) continue;
    const slug = m[1];
    if (/^\d+$/.test(slug) || slug === 'reviews') continue;
    corpus.push({url, slug, tokens: tokenize(slug, stop)});
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
  const tt = tokenize(title, stop);
  if (!tt.length) return [];
  const scored = [];
  for (const c of corpus) {
    const m = matchScore(tt, c.tokens);
    if (!m || m.extras > 2) continue;
    scored.push({...c, ...m, titleLen: tt.length});
  }
  scored.sort((a, b) => a.score - b.score || compareText(a.url, b.url));
  return scored.slice(0, 3);
}

const rows = await readGames();

const report = [];
for (const row of rows) {
  if (hasSource(row, 'gamespot')) continue;
  report.push({row, slug: row.slug, title: row.title, cand: candidates(row.title)});
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
  // TODO(data): move these reviewed overrides to data/gamespot-overrides.json
  // once the data files are consolidated; keep them here for now.
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
  for (const {row, slug, cand} of report) {
    if (overrides[slug]) { addSource(row, {site: 'gamespot', kind: 'review', language: 'en', score: null, url: overrides[slug]}); filled += 1; continue; }
    const best = cand[0];
    if (best && best.extras === 0 && best.prefixLen === best.titleLen) { addSource(row, {site: 'gamespot', kind: 'review', language: 'en', score: null, url: best.url}); filled += 1; }
  }
  await writeGames(rows);
  console.error(`wrote GameSpot sources for ${filled} rows`);
}
