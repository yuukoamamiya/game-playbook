import {copyFile, mkdir, readdir, stat} from 'node:fs/promises';
import {dirname, extname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = resolve(root, 'content/reviews/en');
const targetRoot = resolve(root, 'static/img/reviews-gs');
const imageExtensions = new Set(['.webp', '.jpg', '.png']);

// Review illustrations live next to the private English sources so that the
// Markdown is self-contained. Docusaurus can only serve files under static/,
// so copy them there before start/build. The copies are generated, not tracked.
//
// The copy is incremental (mtime/size check) and only touches image files, so a
// rebuild does not wipe and rewrite the whole folder.

const stats = {copied: 0, skipped: 0};

async function syncDirectory(source, target) {
  for (const entry of await readdir(source, {withFileTypes: true})) {
    const from = resolve(source, entry.name);
    const to = resolve(target, entry.name);
    if (entry.isDirectory()) {
      await mkdir(to, {recursive: true});
      await syncDirectory(from, to);
      continue;
    }
    if (!entry.isFile() || !imageExtensions.has(extname(entry.name).toLowerCase())) continue;

    const [sourceInfo, targetInfo] = await Promise.all([
      stat(from),
      stat(to).catch(() => null),
    ]);
    if (targetInfo && targetInfo.size === sourceInfo.size && targetInfo.mtimeMs >= sourceInfo.mtimeMs) {
      stats.skipped += 1;
      continue;
    }
    await copyFile(from, to);
    stats.copied += 1;
  }
}

let sourceExists = true;
try {
  sourceExists = (await stat(sourceRoot)).isDirectory();
} catch {
  sourceExists = false;
}

if (!sourceExists) {
  console.log(`No review image sources at ${sourceRoot}; nothing to sync.`);
} else {
  await mkdir(targetRoot, {recursive: true});
  for (const slug of await readdir(sourceRoot)) {
    const source = resolve(sourceRoot, slug, 'images');
    let info;
    try {
      info = await stat(source);
    } catch {
      continue;
    }
    if (!info.isDirectory()) continue;
    const target = resolve(targetRoot, slug);
    await mkdir(target, {recursive: true});
    await syncDirectory(source, target);
  }
  console.log(`synced ${stats.copied} review images (${stats.skipped} unchanged) to static/img/reviews-gs`);
}
