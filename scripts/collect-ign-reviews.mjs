import {mkdir, readFile, writeFile, access} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const csvPath = resolve(root, 'data/metacritic-games.csv');
const outDir = resolve(root, 'content/reviews/en');
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const force = process.argv.includes('--force');
const delayMs = Number(process.env.IGN_DELAY_MS ?? 1200);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(value);
      value = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(value);
      if (row.some((cell) => cell !== '')) rows.push(row);
      row = [];
      value = '';
    } else {
      value += char;
    }
  }

  if (value || row.length > 0) {
    row.push(value);
    if (row.some((cell) => cell !== '')) rows.push(row);
  }

  const [header = [], ...records] = rows;
  return records.map((record) => Object.fromEntries(
    header.map((name, index) => [name, record[index] ?? '']),
  ));
}

function decodeEntities(value) {
  const named = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    mdash: '\u2014', ndash: '\u2013', hellip: '\u2026', rsquo: '\u2019',
    lsquo: '\u2018', rdquo: '\u201d', ldquo: '\u201c', copy: '\u00a9',
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code) => {
    if (code[0] === '#') {
      const hex = code[1] === 'x' || code[1] === 'X';
      const number = Number.parseInt(hex ? code.slice(2) : code.slice(1), hex ? 16 : 10);
      return Number.isFinite(number) ? String.fromCodePoint(number) : match;
    }
    return named[code.toLowerCase()] ?? match;
  });
}

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

  text = decodeEntities(text)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

function yamlString(value) {
  return `"${String(value ?? '').replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
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
  const response = await fetch(url, {headers: {'User-Agent': userAgent, 'Accept-Language': 'en-US,en;q=0.9'}});
  const html = await response.text();
  const page = response.ok ? pageFromNextData(extractNextData(html)) : null;
  const result = {status: response.status, page};
  cache.set(url, result);
  return result;
}

function renderMarkdown(row, page) {
  const review = page.review ?? {};
  const author = page.contributors?.[0]?.name ?? '';
  const published = (page.publishDate ?? '').slice(0, 10);
  let body = htmlToMarkdown(page.processedHtml);

  const verdictText = typeof review.verdict === 'string' ? htmlToMarkdown(review.verdict) : '';
  if (verdictText && !body.includes(verdictText.slice(0, 60))) {
    body = `${body}\n\n### Verdict\n\n${verdictText}`;
  }

  const frontmatter = [
    '---',
    `slug: ${yamlString(row.slug)}`,
    `source_title: ${yamlString(row.title)}`,
    `source_url: ${yamlString(row.ign_url)}`,
    'source_site: IGN',
    `review_score: ${Number.isFinite(review.score) ? review.score : 'null'}`,
    `review_score_text: ${yamlString(review.scoreText ?? '')}`,
    `author: ${yamlString(author)}`,
    `published: ${yamlString(published)}`,
    '---',
  ].join('\n');

  const meta = [
    `- Source: [IGN](${row.ign_url})`,
    author ? `- Author: ${author}` : '',
    published ? `- Published: ${published}` : '',
    Number.isFinite(review.score) ? `- IGN score: ${review.score}/10${review.scoreText ? ` (${review.scoreText})` : ''}` : '',
  ].filter(Boolean);

  const header = [`# ${row.title} — IGN Review`, '', ...meta].join('\n');

  return `${frontmatter}\n\n${header}\n\n${body}\n`;
}

await mkdir(outDir, {recursive: true});
const rows = parseCsv(await readFile(csvPath, 'utf8'));

const targets = [];
const seenSlugs = new Set();
for (const row of rows) {
  if (!row.ign_url || !row.ign_url.includes('ign.com')) continue;
  if (seenSlugs.has(row.slug)) continue;
  seenSlugs.add(row.slug);
  targets.push(row);
}

let written = 0;
let skipped = 0;
let failed = 0;

for (const row of targets) {
  const outPath = resolve(outDir, `${row.slug}.md`);
  if (!force && await exists(outPath)) {
    skipped += 1;
    console.log(`SKIP  ${row.slug}`);
    continue;
  }
  try {
    const {status, page} = await fetchPage(row.ign_url);
    if (!page) {
      failed += 1;
      console.log(`FAIL  ${row.slug} | HTTP ${status} | no article body | ${row.ign_url}`);
      continue;
    }
    await writeFile(outPath, renderMarkdown(row, page), 'utf8');
    written += 1;
    console.log(`OK    ${row.slug} | ${page.review?.score ?? '-'}/10 | ${row.ign_url}`);
  } catch (error) {
    failed += 1;
    console.log(`ERROR ${row.slug} | ${error.message} | ${row.ign_url}`);
  }
  await new Promise((resolveDelay) => setTimeout(resolveDelay, delayMs));
}

console.log(`\nwritten ${written} | skipped ${skipped} | failed ${failed} | targets ${targets.length}`);
