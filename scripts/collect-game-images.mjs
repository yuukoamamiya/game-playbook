import {readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {readGames, root} from './data-store.mjs';
import {fetchWithTimeout} from './lib/fetch.mjs';
import {exists, fetchImageSource, saveWebp, updateDocument} from './lib/images.mjs';
import {parseConcurrency, pool} from './lib/concurrency.mjs';

const docsDir = resolve(root, 'docs/games');
const imageDir = resolve(root, 'static/img/reviews-webp');
const force = process.argv.includes('--force');
const concurrency = parseConcurrency(process.argv, 4);
const onlySlugs = (process.argv.find((arg) => arg.startsWith('--slug='))?.slice('--slug='.length) ?? '')
  .split(',').map((slug) => slug.trim()).filter(Boolean);

function imageCandidates(html) {
  const decoded = html
    .replaceAll('\\/', '/')
    .replaceAll('&amp;', '&');
  const urls = [...decoded.matchAll(/https?:\/\/[^"'<>\s]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'<>\s]*)?/gi)]
    .map((match) => match[0].replace(/[),]+$/, ''))
    .filter((url) => url.includes('/catalog/provider/'));
  return [...new Set(urls)].sort((left, right) => {
    const score = (url) => (url.includes('fit=crop') && url.includes('width=1200') ? 0 : 1);
    return score(left) - score(right);
  });
}

const rows = await readGames();
const imageNames = new Set((await readdir(imageDir)).filter((file) => file.endsWith('.webp')));
const targets = [...new Map(rows
  .filter((row) => row.must_play === true && (force || !imageNames.has(`${row.slug}.webp`)))
  .filter((row) => !onlySlugs.length || onlySlugs.includes(row.slug))
  .map((row) => [row.slug, row])).values()];

const failures = [];
const stats = {downloaded: 0, skipped: 0, failed: 0, docsUpdated: 0};

async function processOne(row) {
  const outputPath = resolve(imageDir, `${row.slug}.webp`);
  if (!force && await exists(outputPath)) {
    stats.skipped += 1;
    return;
  }

  try {
    const page = await fetchWithTimeout(row.metacritic_url, {headers: {'Accept-Language': 'en-US,en;q=0.9'}}, {timeoutMs: 45000});
    if (!page.ok) throw new Error(`Metacritic HTTP ${page.status}`);
    const html = await page.text();
    const candidates = imageCandidates(html);
    if (!candidates.length) throw new Error('no Metacritic image candidate');

    let source = null;
    let image = null;
    for (const candidate of candidates.slice(0, 8)) {
      try {
        image = await fetchImageSource(candidate);
        source = candidate;
        break;
      } catch {
        // Try the next image candidate from the same game page.
      }
    }
    if (!image) throw new Error('all image candidates failed');

    await saveWebp(image, outputPath);
    const updated = await updateDocument(row.slug, {docsDir});
    stats.downloaded += 1;
    if (updated) stats.docsUpdated += 1;
    console.log(`OK    ${row.slug} | ${source}`);
  } catch (error) {
    stats.failed += 1;
    failures.push(`${row.slug}: ${error.message}`);
    console.log(`FAIL  ${row.slug} | ${error.message}`);
  }
}

await pool(targets, processOne, {concurrency});
console.log(`\ndownloaded ${stats.downloaded} | skipped ${stats.skipped} | failed ${stats.failed} | docsUpdated ${stats.docsUpdated} | targets ${targets.length}`);
if (failures.length) console.log(`failures:\n${failures.join('\n')}`);
if (stats.failed) process.exitCode = 1;
