import {readFile, writeFile, readdir, mkdir, access, unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {root} from './data-store.mjs';

const enDir = resolve(root, 'content/reviews/en');
const docDir = resolve(root, 'docs/games');
const imgDir = resolve(root, 'static/img/reviews-webp');
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const maxWidth = 1280;
const goodEnough = 900;
const concurrency = 6;
const force = process.argv.includes('--force');
const execFileAsync = promisify(execFile);

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

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
  const response = await fetch(normalize(url), {headers: {'User-Agent': userAgent}});
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 1000) throw new Error(`too small (${buffer.length} bytes)`);
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
    const tempPath = resolve(imgDir, `.tmp-${slug}-${process.pid}`);
    try {
      await writeFile(tempPath, chosen.buffer);
      await execFileAsync('ffmpeg', [
        '-y', '-loglevel', 'error', '-i', tempPath,
        '-c:v', 'libwebp', '-q:v', '82', outPath,
      ]);
    } finally {
      await unlink(tempPath).catch(() => {});
    }
    stats.downloaded += 1;
    console.log(`IMG   ${slug} | ${chosen.width}x${chosen.height} | ${chosen.buffer.length} bytes`);
  }

  const docPath = resolve(docDir, `${slug}.mdx`);
  if (await exists(docPath)) {
    let doc = await readFile(docPath, 'utf8');
    const marker = new RegExp(`/img/reviews(?:-webp)?/${slug}\\.(?:jpg|webp)`);
    if (!marker.test(doc)) {
      const title = (doc.match(/^#\s+(.*)$/m)?.[1] ?? slug).trim();
      const imageLine = `![${title} 游戏头图](/img/reviews-webp/${slug}.webp)`;
      doc = doc.replace(/^(#\s+.*)$/m, `$1\n\n${imageLine}`);
      await writeFile(docPath, doc, 'utf8');
      stats.docsUpdated += 1;
    }
  }
}

let cursor = 0;
async function worker() {
  while (cursor < files.length) {
    const file = files[cursor];
    cursor += 1;
    await processOne(file);
  }
}
await Promise.all(Array.from({length: concurrency}, worker));

console.log(`\ndownloaded ${stats.downloaded} | skipped ${stats.skipped} | failed ${stats.failed} | docsUpdated ${stats.docsUpdated}`);
if (failures.length) console.log(`notes:\n${failures.join('\n')}`);
