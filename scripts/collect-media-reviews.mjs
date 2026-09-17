import {readFile, writeFile, mkdir, access, rm} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {tmpdir} from 'node:os';

const execFileP = promisify(execFile);

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = resolve(root, 'data/metacritic-games.json');
const enDir = resolve(root, 'content/reviews/en');
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const PROXY = 'http://127.0.0.1:10809';

// Some sites return 403/timeout to a direct connection and only respond through
// the local proxy (v2rayN); mark those with `proxy: true`. Avoid curl's
// `--ssl-no-revoke` here: Cloudflare (e.g. Unwinnable) rejects that handshake.
const SITES = {
  eurogamer: { start: /<div class="article_body_content[^>]*>/, end: /<div[^>]*class="[^"]*read-next/, proxy: true },
  rockpapershotgun: { start: /<div class="article_body_content[^>]*>/, end: /<div[^>]*class="[^"]*read-next/, proxy: true },
  adventuregamers: { start: /<div class="[^"]*ag-content-area"/, end: /<footer/ },
  rpgsite: { start: /<div id="article-story"[^>]*>/, end: /<\/article>|<div[^>]*class="[^"]*(?:comments|related)/ },
  theatlantic: { start: /<section class="ArticleBody_root[^"]*"[^>]*>/, end: /<footer|class="ArticleBelow|class="ArticleFooter/, proxy: true },
  jesperjuul: { start: /<article id="post-[^"]*"[^>]*>/, end: /<\/article>/, minLength: 300 },
  gamestudies: { start: /<BODY[^>]*>/i, end: /<\/BODY>/i, proxy: true },
  '4gamer': { start: /<div\s+class="maintxt">/, end: /関連タイトル/ },
  unwinnable: { start: /<article[^>]*>[\s\S]*?<\/header>/, end: /<\w+[^>]*class="tnp-subscription-posts"|<\w+[^>]*class="entry-bottom"|<\w+[^>]*class="related-post/, proxy: true, delay: 1500, authorPattern: /rel="author"[^>]*>([^<]+)<\/a>/, strip: [/You feel compelled to support great writing…\s*/] },
  aftermath: { start: /<article[^>]*>/, end: /<\/article>/, proxy: true },
  famitsu: { start: /<div class="ArticleDetailBody_articleBody__[^"]*"/, end: /<\w[^>]*class="ArticleDetailBody_(?:buttonList|pager)__|<\w[^>]*class="ArticleDetail_articleMainFooter__/ },
  ign: {
    variants: [
      { host: /ign\.com\.cn$/, start: /<div[^>]*class="[^"]*article-body[^"]*"/, end: /<\/article>/ },
      { start: /<div data-cy="article-content"/, end: /data-cy="comments-view-trigger"|data-cy="footer"/ },
    ],
  },
};

function siteConfig(site, url) {
  const config = SITES[site];
  if (!config) return null;
  if (!config.variants) return config;
  let host = '';
  try { host = new URL(url).hostname; } catch { /* keep empty */ }
  return config.variants.find((v) => !v.host || v.host.test(host)) ?? config.variants[config.variants.length - 1];
}

function decodeEntities(s) {
  const named = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '\u2014', ndash: '\u2013', hellip: '\u2026', rsquo: '\u2019', lsquo: '\u2018', rdquo: '\u201d', ldquo: '\u201c'};
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, c) => {
    if (c[0] === '#') { const hex = c[1] === 'x' || c[1] === 'X'; const n = parseInt(hex ? c.slice(2) : c.slice(1), hex ? 16 : 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
    return named[c.toLowerCase()] ?? m;
  });
}

function htmlToText(html) {
  return decodeEntities(
    html.replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<figure[\s\S]*?<\/figure>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p[^>]*>/gi, '\n\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<h2[^>]*>/gi, '\n\n## ').replace(/<h3[^>]*>/gi, '\n\n### ')
      .replace(/<\/h[23]>/gi, '\n\n')
      .replace(/<li[^>]*>/gi, '\n- ')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function jsonLdMeta(html) {
  const meta = {};
  for (const block of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    let data;
    try { data = JSON.parse(block[1]); } catch { continue; }
    const nodes = [];
    const walk = (o) => {
      if (!o || typeof o !== 'object') return;
      if (Array.isArray(o)) { o.forEach(walk); return; }
      if (o['@graph']) walk(o['@graph']);
      nodes.push(o);
    };
    walk(data);
    for (const node of nodes) {
      const type = node['@type'];
      if (type !== 'Review' && type !== 'Article' && type !== 'NewsArticle' && type !== 'WebPage') continue;
      if (!meta.headline && (node.headline || node.name)) meta.headline = node.headline || node.name;
      if (!meta.author && node.author) {
        const a = Array.isArray(node.author) ? node.author[0] : node.author;
        meta.author = typeof a === 'string' ? a : (a?.name ?? '');
      }
      if (!meta.date && node.datePublished) meta.date = String(node.datePublished).slice(0, 10);
      if (!meta.score && node.reviewRating?.ratingValue) meta.score = node.reviewRating.ratingValue;
    }
  }
  return meta;
}

function extractBody(html, config) {
  const startMatch = html.match(config.start);
  if (!startMatch) return '';
  const from = startMatch.index + startMatch[0].length;
  const rest = html.slice(from);
  const endMatch = rest.match(config.end);
  const chunk = endMatch ? rest.slice(0, endMatch.index) : rest.slice(0, 60000);
  let text = htmlToText(chunk);
  for (const pattern of config.strip ?? []) text = text.replace(pattern, '');
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

async function fetchHtml(url, useProxy) {
  const tmp = resolve(tmpdir(), `mfetch-${process.pid}-${Math.random().toString(36).slice(2)}.html`);
  try {
    const args = ['-sS', '-L', '-m', '45', '-A', userAgent];
    if (useProxy) args.push('-x', PROXY);
    args.push('-o', tmp, '-w', '%{http_code}', url);
    const {stdout} = await execFileP('curl', args, {maxBuffer: 1024 * 1024});
    const status = Number(stdout.trim());
    if (status !== 200) throw new Error(`HTTP ${status}`);
    return await readFile(tmp, 'utf8');
  } finally {
    await rm(tmp, {force: true});
  }
}

async function exists(p) { try { await access(p); return true; } catch { return false; } }

const args = process.argv.slice(2);
const flag = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3).split(',').map((s) => s.trim()).filter(Boolean) : [];
};
const onlySites = [...args.filter((a) => !a.startsWith('--')), ...flag('site')];
const onlySlugs = flag('slug');

const records = JSON.parse(await readFile(dataPath, 'utf8'));
const targets = [];
const seen = new Set();
for (const rec of records) {
  for (const src of (rec.sources ?? [])) {
    if (!SITES[src.site]) continue;
    if (onlySites.length && !onlySites.includes(src.site)) continue;
    if (onlySlugs.length && !onlySlugs.includes(rec.slug)) continue;
    const key = `${rec.slug}|${src.site}|${src.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    targets.push({slug: rec.slug, title: rec.title, site: src.site, url: src.url, score: src.score});
  }
}
console.error(`targets: ${targets.length}`);

let written = 0, skipped = 0, failed = 0;
const failures = [];
const concurrency = Number(flag('concurrency')[0] ?? 5);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let cursor = 0;

async function processOne(t) {
  await mkdir(resolve(enDir, t.slug), {recursive: true});
  const basePath = resolve(enDir, t.slug, `${t.site}.md`);
  let outPath = basePath;
  if (await exists(basePath)) {
    const existing = ((await readFile(basePath, 'utf8')).match(/^source_url:\s*"?(.*?)"?\s*$/m) ?? [])[1]?.trim();
    if (!existing || existing === t.url) { skipped += 1; return; }
    const key = t.url.replace(/\/$/, '').split('/').pop().replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 48);
    outPath = resolve(enDir, t.slug, `${t.site}-${key}.md`);
    if (await exists(outPath)) { skipped += 1; return; }
  }
  try {
    const res = {ok: true};
    const config = siteConfig(t.site, t.url);
    const html = await fetchHtml(t.url, config.proxy);
    if (config.delay) await sleep(config.delay);
    const body = extractBody(html, config);
    if (body.length < (config.minLength ?? 800)) throw new Error(`body too short (${body.length})`);
    const meta = jsonLdMeta(html);
    if (!meta.author && config.authorPattern) {
      const match = html.match(config.authorPattern);
      if (match) meta.author = decodeEntities(match[1]).trim();
    }
    const title = meta.headline || t.title;
    const fm = [
      '---',
      `slug: ${JSON.stringify(t.slug)}`,
      `source_title: ${JSON.stringify(title)}`,
      `source_url: ${JSON.stringify(t.url)}`,
      `source_site: ${t.site}`,
      `review_score: ${meta.score ?? t.score ?? 'null'}`,
      `review_score_text: ""`,
      `author: ${JSON.stringify(meta.author ?? '')}`,
      `published: ${JSON.stringify(meta.date ?? '')}`,
      '---',
      '',
      `# ${title} — ${t.site} Review`,
      '',
      `- Source: [${t.site}](${t.url})`,
      meta.author ? `- Author: ${meta.author}` : '',
      meta.date ? `- Published: ${meta.date}` : '',
      meta.score ? `- Score: ${meta.score}` : '',
      '',
      body,
      '',
    ].filter((line) => line !== null).join('\n');
    await writeFile(outPath, fm, 'utf8');
    written += 1;
    console.log(`OK    ${t.slug} | ${t.site} | ${body.length} chars`);
  } catch (e) {
    failed += 1;
    failures.push(`${t.slug} | ${t.site} | ${e.message} | ${t.url}`);
  }
}

async function worker() { while (cursor < targets.length) { const t = targets[cursor]; cursor += 1; await processOne(t); } }
await Promise.all(Array.from({length: concurrency}, worker));

console.log(`\nwritten ${written} | skipped ${skipped} | failed ${failed}`);
if (failures.length) console.log(`failures:\n${failures.join('\n')}`);
