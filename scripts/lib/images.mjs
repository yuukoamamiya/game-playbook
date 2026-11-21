// Shared image download/convert/document-update helpers for the cover scripts.

import {execFile} from 'node:child_process';
import {access, readFile, unlink, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {promisify} from 'node:util';

import {fetchWithTimeout} from './fetch.mjs';

const execFileAsync = promisify(execFile);

/** True when the path exists (file or directory). */
export async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** Download an image and reject empty/placeholder responses. */
export async function fetchImageSource(url, {minBytes = 1000, timeoutMs = 45000, proxy = false} = {}) {
  const response = await fetchWithTimeout(url, {}, {timeoutMs, proxy});
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < minBytes) throw new Error(`image too small (${buffer.length} bytes)`);
  return buffer;
}

/** Convert an image file to WebP with ffmpeg. */
export async function convertToWebp(inputPath, outputPath, {quality = 82} = {}) {
  await execFileAsync('ffmpeg', [
    '-y', '-loglevel', 'error', '-i', inputPath,
    '-c:v', 'libwebp', '-q:v', String(quality), outputPath,
  ]);
}

/** Write a downloaded image buffer through a temp file and convert it to WebP. */
export async function saveWebp(buffer, outputPath, {quality = 82, tmpDir} = {}) {
  const tempPath = resolve(tmpDir ?? dirname(outputPath), `.tmp-${process.pid}-${Math.random().toString(36).slice(2)}.img`);
  try {
    await writeFile(tempPath, buffer);
    await convertToWebp(tempPath, outputPath, {quality});
  } finally {
    await unlink(tempPath).catch(() => {});
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Insert the cover image under the game page's H1 unless it is already there.
 *
 * `marker` overrides the "already has an image" detection (the IGN collector
 * also accepts the older `/img/reviews/<slug>.jpg` form). `missingDoc: 'skip'`
 * makes a missing page a no-op instead of an error.
 */
export async function updateDocument(slug, {
  docsDir,
  imagePath = `/img/reviews-webp/${slug}.webp`,
  marker,
  missingDoc = 'throw',
  alt,
} = {}) {
  const docPath = resolve(docsDir, `${slug}.mdx`);
  let doc;
  try {
    doc = await readFile(docPath, 'utf8');
  } catch (error) {
    if (missingDoc === 'skip' && error.code === 'ENOENT') return false;
    throw error;
  }
  if ((marker ?? new RegExp(escapeRegExp(imagePath))).test(doc)) return false;

  const heading = doc.match(/^#\s+.*$/m);
  if (!heading) throw new Error(`${slug}.mdx has no H1 heading`);
  const title = heading[0].replace(/^#\s+/, '').trim() || slug;
  const imageLine = `![${alt ?? `${title} 游戏头图`}](${imagePath})`;
  await writeFile(docPath, doc.replace(heading[0], `${heading[0]}\n\n${imageLine}`), 'utf8');
  return true;
}
