import {mkdir, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readGames} from './data-store.mjs';
import {fetchWithTimeout} from './lib/fetch.mjs';
import {decodeHtml} from './lib/csv.mjs';
import {exists} from './lib/images.mjs';
import {getIgnTargets} from './lib/ign-review-targets.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'content/reviews/en');
const force = process.argv.includes('--force');
const delayMs = Number(process.env.IGN_DELAY_MS ?? 1200);

function htmlToMarkdown(html) {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/?aside[^>]*>/gi, '\n\n')
    .replace(/<figure[\s\S]*?<\/figure>/gi, '')
    .replace(/<section[^>]*data-transform="quoteBox"[^>]*>([\s\S]*?)<\/section>/gi, '\n\n> $1\n\n')
    .replace(/<section[^>]*data-transform="(?:mobile-ad-break|ignvideo|poll|slideshow)"[^>]*>[\s\S]*?<\/section>/gi, '\n\n')
    .replace(/<\/?section[^>]*>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n\n')
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n\n#### $1\n\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
    .replace(/<blockquote[^>]*>/gi, '\n\n> ')
    .replace(/<\/blockquote>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '');

  text = decodeHtml(text)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

function yamlString(value) {
  return `"${String(value ?? '').replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

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

function renderMarkdown(row, page) {
  const sourceUrl = getSources(row).find((source) => source.site === 'ign')?.url ?? '';
  const review = page.review ?? {};
  const author = page.contributors?.[0]?.name ?? '';
  const published = (page.publishDate ?? '').slice(0, 10);
  const isPlaceholder = (url) => /\/ign-\d+\.(?:jpe?g|png)/i.test(url);
  const usableImage = (url) => (url && !isPlaceholder(url) ? url : '');
  const imageUrl = usableImage(page.image) || usableImage(page.primaryObject?.primaryImage?.url) || '';
  const imageFallback = usableImage(page.primaryObject?.primaryImage?.url) || '';
  let body = htmlToMarkdown(page.processedHtml);

  const verdictText = typeof review.verdict === 'string' ? htmlToMarkdown(review.verdict) : '';
  if (verdictText && !body.includes(verdictText.slice(0, 60))) {
    body = `${body}\n\n### Verdict\n\n${verdictText}`;
  }

  const frontmatter = [
    '---',
    `slug: ${yamlString(row.slug)}`,
    `source_title: ${yamlString(row.title)}`,
    `source_url: ${yamlString(sourceUrl)}`,
    'source_site: IGN',
    `review_score: ${Number.isFinite(review.score) ? review.score : 'null'}`,
    `review_score_text: ${yamlString(review.scoreText ?? '')}`,
    `author: ${yamlString(author)}`,
    `published: ${yamlString(published)}`,
    `image: ${yamlString(imageUrl)}`,
    `image_fallback: ${yamlString(imageFallback)}`,
    '---',
  ].join('\n');

  const meta = [
    `- Source: [IGN](${sourceUrl})`,
    author ? `- Author: ${author}` : '',
    published ? `- Published: ${published}` : '',
    Number.isFinite(review.score) ? `- IGN score: ${review.score}/10${review.scoreText ? ` (${review.scoreText})` : ''}` : '',
  ].filter(Boolean);

  const header = [`# ${row.title} — IGN Review`, '', ...meta].join('\n');

  return `${frontmatter}\n\n${header}\n\n${body}\n`;
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
    const {status, page} = await fetchPage(sourceUrl);
    if (!page) {
      failed += 1;
      console.log(`FAIL  ${row.slug} | HTTP ${status} | no article body | ${sourceUrl}`);
      continue;
    }
    await writeFile(outPath, renderMarkdown(row, page), 'utf8');
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
