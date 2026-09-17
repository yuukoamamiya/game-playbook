import {access, mkdir, readdir, readFile, unlink, writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';

import {readGames} from './data-store.mjs';

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = resolve(root, 'docs/games');
const imageDir = resolve(root, 'static/img/reviews-webp');
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36';
const concurrency = 4;
const force = process.argv.includes('--force');

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

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

async function fetchImageSource(url) {
  const response = await fetch(url, {headers: {'User-Agent': userAgent}});
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 1000) throw new Error(`image too small (${buffer.length} bytes)`);
  return buffer;
}

async function convertToWebp(inputPath, outputPath) {
  await execFileAsync('ffmpeg', [
    '-y', '-loglevel', 'error', '-i', inputPath,
    '-c:v', 'libwebp', '-q:v', '82', outputPath,
  ]);
}

async function updateDocument(slug) {
  const docPath = resolve(docsDir, `${slug}.mdx`);
  if (!await exists(docPath)) throw new Error('game page not found');
  let doc = await readFile(docPath, 'utf8');
  if (new RegExp(`/img/reviews-webp/${slug}\\.webp`).test(doc)) return false;
  const title = (doc.match(/^#\s+(.*)$/m)?.[1] ?? slug).trim();
  const imageLine = `![${title} 游戏头图](/img/reviews-webp/${slug}.webp)`;
  const heading = doc.match(/^#\s+.*$/m);
  if (!heading) throw new Error('game page heading not found');
  doc = doc.replace(heading[0], `${heading[0]}\n\n${imageLine}`);
  await writeFile(docPath, doc, 'utf8');
  return true;
}

const rows = await readGames();
const imageNames = new Set((await readdir(imageDir)).filter((file) => file.endsWith('.webp')));
const targets = [...new Map(rows
  .filter((row) => row.must_play === true && (force || !imageNames.has(`${row.slug}.webp`)))
  .map((row) => [row.slug, row])).values()];

await mkdir(imageDir, {recursive: true});
const failures = [];
const stats = {downloaded: 0, skipped: 0, failed: 0, docsUpdated: 0};
let cursor = 0;

async function processOne(row) {
  const outputPath = resolve(imageDir, `${row.slug}.webp`);
  if (!force && await exists(outputPath)) {
    stats.skipped += 1;
    return;
  }

  try {
    const page = await fetch(row.metacritic_url, {headers: {'User-Agent': userAgent, 'Accept-Language': 'en-US,en;q=0.9'}});
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

    const tempPath = resolve(imageDir, `.tmp-${row.slug}-${process.pid}`);
    try {
      await writeFile(tempPath, image);
      await convertToWebp(tempPath, outputPath);
    } finally {
      await unlink(tempPath).catch(() => {});
    }

    const updated = await updateDocument(row.slug);
    stats.downloaded += 1;
    if (updated) stats.docsUpdated += 1;
    console.log(`OK    ${row.slug} | ${source}`);
  } catch (error) {
    stats.failed += 1;
    failures.push(`${row.slug}: ${error.message}`);
    console.log(`FAIL  ${row.slug} | ${error.message}`);
  }
}

async function worker() {
  while (cursor < targets.length) {
    const row = targets[cursor];
    cursor += 1;
    await processOne(row);
  }
}

await Promise.all(Array.from({length: concurrency}, worker));
console.log(`\ndownloaded ${stats.downloaded} | skipped ${stats.skipped} | failed ${stats.failed} | docsUpdated ${stats.docsUpdated} | targets ${targets.length}`);
if (failures.length) console.log(`failures:\n${failures.join('\n')}`);
if (stats.failed) process.exitCode = 1;
