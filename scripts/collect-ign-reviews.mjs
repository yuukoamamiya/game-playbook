import {mkdir, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readGames} from './data-store.mjs';
import {fetchWithTimeout} from './lib/fetch.mjs';
import {exists} from './lib/images.mjs';
import {getIgnTargets} from './lib/ign-review-targets.mjs';
import {fetchAndRenderIgnTarget} from './lib/ign-review-render.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'content/reviews/en');
const force = process.argv.includes('--force');
const delayMs = Number(process.env.IGN_DELAY_MS ?? 1200);

function extractNextData(html) {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function pageFromNextData(data) {
  const page = data?.props?.pageProps?.page;
  if (!page || typeof page.processedHtml !== 'string') return null;
  return page;
}

const cache = new Map();

async function fetchPage(url) {
  if (cache.has(url)) return cache.get(url);
  const response = await fetchWithTimeout(url, {headers: {'Accept-Language': 'en-US,en;q=0.9'}}, {timeoutMs: 45000});
  const html = await response.text();
  const page = response.ok ? pageFromNextData(extractNextData(html)) : null;
  const result = {status: response.status, page};
  cache.set(url, result);
  return result;
}

await mkdir(outDir, {recursive: true});
const rows = await readGames();

const targets = getIgnTargets(rows);

let written = 0;
let skipped = 0;
let failed = 0;

// Sequential by design: IGN rate-limits scrapers and `IGN_DELAY_MS` paces it.
for (const {row, sourceUrl} of targets) {
  const outPath = resolve(outDir, `${row.slug}.md`);
  if (!force && await exists(outPath)) {
    skipped += 1;
    console.log(`SKIP  ${row.slug}`);
    continue;
  }
  try {
    const {status, page, markdown} = await fetchAndRenderIgnTarget({row, sourceUrl}, fetchPage);
    if (!page) {
      failed += 1;
      console.log(`FAIL  ${row.slug} | HTTP ${status} | no article body | ${sourceUrl}`);
      continue;
    }
    await writeFile(outPath, markdown, 'utf8');
    written += 1;
    console.log(`OK    ${row.slug} | ${page.review?.score ?? '-'}/10 | ${sourceUrl}`);
  } catch (error) {
    failed += 1;
    console.log(`ERROR ${row.slug} | ${error.message} | ${sourceUrl}`);
  }
  await new Promise((resolveDelay) => setTimeout(resolveDelay, delayMs));
}

console.log(`\nwritten ${written} | skipped ${skipped} | failed ${failed} | targets ${targets.length}`);
if (failed) process.exitCode = 1;
