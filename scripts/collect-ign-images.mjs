import {readFile, readdir, mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {root} from './data-store.mjs';
import {exists, fetchImageSource, saveWebp, updateDocument} from './lib/images.mjs';
import {parseConcurrency, pool} from './lib/concurrency.mjs';

const enDir = resolve(root, 'content/reviews/en');
const docDir = resolve(root, 'docs/games');
const imgDir = resolve(root, 'static/img/reviews-webp');
const maxWidth = 1280;
const goodEnough = 900;
const force = process.argv.includes('--force');
const concurrency = parseConcurrency(process.argv, 6);

function frontmatterField(fm, name) {
  return (fm.match(new RegExp(`^${name}:\\s*(.*)$`, 'm'))?.[1] ?? '').trim().replace(/^['"]|['"]$/g, '');
}

function normalize(url) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('width', String(maxWidth));
    parsed.searchParams.set('format', 'jpg');
    parsed.searchParams.set('quality', '80');
    return parsed.toString();
  } catch {
    return url;
  }
}

function imageSize(buffer) {
  if (buffer.length > 24 && buffer[0] === 0x89 && buffer[1] === 0x50) {
    return {width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20)};
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let i = 2;
    while (i < buffer.length - 9) {
      if (buffer[i] !== 0xff) { i += 1; continue; }
      const marker = buffer[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return {height: buffer.readUInt16BE(i + 5), width: buffer.readUInt16BE(i + 7)};
      }
      i += 2 + buffer.readUInt16BE(i + 2);
    }
  }
  return {width: 0, height: 0};
}

async function fetchImage(url) {
  const buffer = await fetchImageSource(normalize(url));
  return {buffer, ...imageSize(buffer)};
}

await mkdir(imgDir, {recursive: true});

const files = (await readdir(enDir)).filter((f) => f.endsWith('.md') && !['README.md', '_template.md'].includes(f));
const failures = [];
const stats = {downloaded: 0, skipped: 0, failed: 0, docsUpdated: 0};

async function processOne(file) {
  const slug = file.replace(/\.md$/, '');
  const fm = (await readFile(resolve(enDir, file), 'utf8')).match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const primary = frontmatterField(fm, 'image');
  const fallback = frontmatterField(fm, 'image_fallback');
  const outPath = resolve(imgDir, `${slug}.webp`);

  if (!primary && !fallback) {
    stats.failed += 1;
    failures.push(`${slug}: no image url`);
    return;
  }

  if (!force && await exists(outPath)) {
    stats.skipped += 1;
  } else {
    let chosen = null;
    if (primary) {
      try { chosen = await fetchImage(primary); } catch (error) { failures.push(`${slug}: primary ${error.message}`); }
    }
    if ((!chosen || chosen.width < goodEnough) && fallback) {
      try {
        const alt = await fetchImage(fallback);
        if (!chosen || alt.width * alt.height > chosen.width * chosen.height) chosen = alt;
      } catch (error) { failures.push(`${slug}: fallback ${error.message}`); }
    }
    if (!chosen) {
      stats.failed += 1;
      failures.push(`${slug}: all candidates failed`);
      return;
    }
    await saveWebp(chosen.buffer, outPath);
    stats.downloaded += 1;
    console.log(`IMG   ${slug} | ${chosen.width}x${chosen.height} | ${chosen.buffer.length} bytes`);
  }

  const updated = await updateDocument(slug, {
    docsDir: docDir,
    marker: new RegExp(`/img/reviews(?:-webp)?/${slug}\\.(?:jpg|webp)`),
    missingDoc: 'skip',
  });
  if (updated) stats.docsUpdated += 1;
}

await pool(files, processOne, {concurrency});

console.log(`\ndownloaded ${stats.downloaded} | skipped ${stats.skipped} | failed ${stats.failed} | docsUpdated ${stats.docsUpdated}`);
if (failures.length) console.log(`notes:\n${failures.join('\n')}`);
if (stats.failed) process.exitCode = 1;
