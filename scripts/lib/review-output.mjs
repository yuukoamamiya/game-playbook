import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {basename, resolve} from 'node:path';
import {exists} from './images.mjs';

function sourceUrl(contents) {
  return (contents.match(/^source_url:\s*("(?:\\.|[^"\\])*"|'[^']*'|.*?)\s*$/m) ?? [])[1]
    ?.replace(/^"|"$/g, '')
    ?.replace(/\\"/g, '"')
    ?.trim();
}

function urlKey(url) {
  let lastSegment = '';
  try {
    lastSegment = basename(new URL(url).pathname);
  } catch {
    lastSegment = basename(url.split(/[?#]/, 1)[0]);
  }
  const readable = lastSegment.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-|-$/g, '').slice(0, 48);
  const hash = createHash('sha256').update(url).digest('hex').slice(0, 12);
  return `${readable || 'article'}-${hash}`;
}

async function matchesUrl(path, url) {
  if (!await exists(path)) return false;
  try {
    return sourceUrl(await readFile(path, 'utf8')) === url;
  } catch {
    return false;
  }
}

/** Pick a non-destructive output path before fetching a review. */
export async function chooseReviewOutputPath(directory, site, url) {
  const primary = resolve(directory, `${site}.md`);
  if (!await exists(primary)) return {path: primary, skip: false};
  if (await matchesUrl(primary, url)) return {path: primary, skip: true};

  const key = urlKey(url);
  for (let suffix = 1; ; suffix += 1) {
    const candidate = resolve(directory, `${site}-${key}${suffix === 1 ? '' : `-${suffix}`}.md`);
    if (!await exists(candidate)) return {path: candidate, skip: false};
    if (await matchesUrl(candidate, url)) return {path: candidate, skip: true};
  }
}
