import {cp, mkdir, readdir, rm, stat} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = resolve(root, 'content/reviews/en');
const targetRoot = resolve(root, 'static/img/reviews-gs');

// Review illustrations live next to the private English sources so that the
// Markdown is self-contained. Docusaurus can only serve files under static/,
// so copy them there before start/build. The copies are generated, not tracked.
await rm(targetRoot, {recursive: true, force: true});
await mkdir(targetRoot, {recursive: true});

let images = 0;
for (const slug of await readdir(sourceRoot)) {
  const source = resolve(sourceRoot, slug, 'images');
  try {
    if (!(await stat(source)).isDirectory()) continue;
  } catch {
    continue;
  }
  const target = resolve(targetRoot, slug);
  await cp(source, target, {recursive: true});
  images += (await readdir(target)).filter((name) => name.endsWith('.webp')).length;
}

console.log(`synced ${images} review images to static/img/reviews-gs`);
