import fs from 'node:fs/promises';
import {ProxyAgent, fetch} from 'undici';
import {readGames, writeGames} from './data-store.mjs';

const userAgent = 'Mozilla/5.0 (compatible; GamePlaybookResearch/1.0)';
const proxyUrl = process.env.GAME_PLAYBOOK_HTTP_PROXY || 'http://127.0.0.1:10809';
const dispatcher = new ProxyAgent(proxyUrl);

const media = [
  {key: 'pcgamer', field: 'pcgamer_url', domain: 'pcgamer.com', label: 'PC Gamer'},
  {key: 'eurogamer', field: 'eurogamer_url', domain: 'eurogamer.net', label: 'Eurogamer'},
  {key: 'nintendolife', field: 'nintendolife_url', domain: 'nintendolife.com', label: 'Nintendo Life'},
  {key: 'rockpapershotgun', field: 'rockpapershotgun_url', domain: 'rockpapershotgun.com', label: 'Rock Paper Shotgun'},
  {key: 'rpgsite', field: 'rpgsite_url', domain: 'rpgsite.net', label: 'RPG Site'},
  {key: 'adventuregamers', field: 'adventuregamers_url', domain: 'adventuregamers.com', base: 'adventuregamers.com', label: 'Adventure Gamers'},
  {key: 'nintendoworldreport', field: 'nintendoworldreport_url', domain: 'nintendoworldreport.com', base: 'www.nintendoworldreport.com', listing: 'https://www.nintendoworldreport.com/review/', label: 'Nintendo World Report'},
];

const excludedWords = /\b(preview|previews|hands[- ]?on|impressions|news|guide|guides|walkthrough|trailer|video|feature|interview|tips|wiki|攻略|新闻|预览|试玩|deal|sale|best games|release date|patch notes|update|review roundup|movie review|film review|tv review|after[- ]further[- ]review|wrap[- ]up|discussion|online[- ]slots|rave reviews|where['’]?s our review|ai[- ]generated|metacritic|world[- ]of[- ]mods|mod|review[- ]bomb|bombed|being review|mixed steam reviews|steam reviews|working on|translation|on[- ]the[- ]way|quality issues)\b/i;
const reviewWords = /\breview(?:ed|s|ing)?\b|reviews|\brecensione\b/i;
const sitemapCache = new Map();
const pageTitleCache = new Map();

function parseCsvLine(line) {
  const values = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"' && quoted) {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(value);
      value = '';
    } else {
      value += char;
    }
  }
  values.push(value);
  return values;
}

function csvCell(value) {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function decodeHtml(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&#39;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&#x27;', "'");
}

function cleanText(value) {
  return decodeHtml(value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
}

function extractBingTargetUrl(href) {
  const decodedHref = decodeHtml(href);
  try {
    const parsed = new URL(decodedHref, 'https://www.bing.com');
    const encoded = parsed.searchParams.get('u');
    if (encoded?.startsWith('a1')) {
      const decoded = Buffer.from(encoded.slice(2), 'base64').toString('utf8');
      return decoded.startsWith('http') ? decoded : decodedHref;
    }
    return decodedHref;
  } catch {
    return decodedHref;
  }
}

function parseSearchResults(html, target) {
  const results = [];
  const anchorPattern = /<li[^>]+class="[^">]*b_algo[^">]*"[\s\S]*?<h2[^>]*><a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorPattern)) {
    const url = extractBingTargetUrl(match[1]);
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      continue;
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) continue;
    if (!(parsed.hostname === target.domain || parsed.hostname.endsWith(`.${target.domain}`))) continue;
    const itemStart = Math.max(0, match.index ?? 0);
    const item = html.slice(itemStart, Math.min(html.length, itemStart + 6000));
    const title = cleanText(match[2]);
    const snippet = cleanText(item.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? '');
    const canonical = `${parsed.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (!results.some((result) => result.url === canonical)) results.push({url: canonical, title, snippet});
  }
  return results;
}

function normalizedTokens(title) {
  const normalized = title.toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b(iii|iv|ii|vi|v)\b/g, (value) => ({ii: '2', iii: '3', iv: '4', v: '5', vi: '6'})[value] ?? value)
    .replace(/[^a-z0-9]+/g, ' ');
  return normalized.split(/\s+/).filter((token) => (token.length > 1 || /^\d$/.test(token)) && !['the', 'a', 'an', 'of', 'and', 'edition', 'definitive', 'version', 'game'].includes(token));
}

function chooseReview(results, title) {
  const tokens = normalizedTokens(title);
  if (!tokens.length) return null;
  const ranked = results.map((result, index) => {
    const haystack = `${result.url} ${result.title} ${result.snippet}`.toLowerCase()
      .replace(/\b(iii|iv|ii|vi|v)\b/g, (value) => ({ii: '2', iii: '3', iv: '4', v: '5', vi: '6'})[value] ?? value);
    const matched = tokens.filter((token) => haystack.includes(token));
    const coverage = matched.length / tokens.length;
    let score = matched.length * 3 + coverage * 4 - index * 0.1;
    if (reviewWords.test(`${result.url} ${result.title} ${result.snippet}`)) score += 7;
    if (excludedWords.test(`${result.url} ${result.title} ${result.snippet}`)) score -= 15;
    if (/\/reviews?\//i.test(result.url)) score += 3;
    return {...result, score, coverage, matched: matched.length};
  }).sort((left, right) => right.score - left.score);
  const best = ranked[0];
  if (!best || best.coverage < (tokens.length <= 2 ? 1 : 0.7) || best.score < 10) return null;
  return best;
}

function extractLocations(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => decodeHtml(match[1]));
}

async function fetchText(url) {
  const response = await fetch(url, {
    dispatcher,
    headers: { 'User-Agent': userAgent, Accept: 'text/html,application/xml,text/xml' },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function getSitemapArticleUrls(target) {
  if (sitemapCache.has(target.key)) return sitemapCache.get(target.key);
  let articleUrls = [];
  try {
    const root = await fetchText(`https://${target.base ?? `www.${target.domain}`}/sitemap.xml`);
    const children = extractLocations(root).filter((url) => /sitemap/i.test(url) && /\.xml(?:\.gz)?(?:$|\?)/i.test(url));
    const childResults = await Promise.all(children.map(async (url) => {
      try {
        const xml = await fetchText(url);
        return extractLocations(xml);
      } catch {
        return [];
      }
    }));
    articleUrls = childResults.flat().filter((url) => {
      try {
        const parsed = new URL(url);
        return parsed.hostname === target.domain || parsed.hostname.endsWith(`.${target.domain}`);
      } catch {
        return false;
      }
    });
  } catch {
    articleUrls = [];
  }
  if (!articleUrls.length && target.listing) {
    try {
      const html = await fetchText(target.listing);
      const links = [...html.matchAll(/href\s*=\s*["']([^"']*\/review(?:mini)?\/[^"']+)["']/gi)]
        .map((match) => new URL(match[1], target.listing).href.split('?')[0]);
      articleUrls = links;
    } catch {
      articleUrls = [];
    }
  }
  const unique = [...new Set(articleUrls)];
  sitemapCache.set(target.key, unique);
  console.log(`SITEMAP | ${target.label} | ${unique.length} URLs`);
  return unique;
}

function pathTokens(url) {
  let path = url.toLowerCase();
  try {
    path = decodeURIComponent(path);
  } catch {
    // Keep the encoded path if it contains malformed escaping.
  }
  return path
    .replace(/\b(iii|iv|ii|vi|v)\b/g, (value) => ({ii: '2', iii: '3', iv: '4', v: '5', vi: '6'})[value] ?? value)
    .replace(/[^a-z0-9]+/g, ' ');
}

function hasDisambiguationMismatch(title, url) {
  const titleSet = new Set(normalizedTokens(title));
  const path = pathTokens(url);
  for (const match of path.matchAll(/\b(\d)\b/g)) {
    const number = match[1];
    const before = path.slice(0, match.index);
    if (!titleSet.has(number) && !/\breview\s*$/.test(before)) return true;
  }
  const versionWords = ['remastered', 'remaster', 'remake', 'ragnarok', 'requiem', 'origins', 'royal', 'vengeance', 'shadowbringers', 'endwalker', 'burning', 'crusade', 'wrath', 'lich', 'avatar', 'alyx', 'silksong', 'infinite', 'beyond', 'enhanced', 'redux', 'legacy'];
  return versionWords.some((word) => new RegExp(`\\b${word}s?\\b`).test(path) && !titleSet.has(word));
}

function hasSimpleTitleMatch(title, url) {
  const tokens = normalizedTokens(title);
  if (tokens.length !== 1) return true;
  const words = pathTokens(url).split(/\s+/);
  const index = words.indexOf(tokens[0]);
  if (index < 0) return false;
  return words[index - 1] === 'review' || words[index + 1] === 'review';
}

function extractPageTitle(html) {
  const ogTitle = html.match(/<meta[^>]+(?:property|name)=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:title["']/i)?.[1];
  const title = ogTitle ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '';
  return cleanText(title);
}

async function getPageTitle(url) {
  if (pageTitleCache.has(url)) return pageTitleCache.get(url);
  try {
    const html = await fetchText(url);
    const title = extractPageTitle(html);
    pageTitleCache.set(url, title);
    return title;
  } catch {
    pageTitleCache.set(url, '');
    return '';
  }
}

async function findReviewFromSitemap(target, title) {
  const urls = await getSitemapArticleUrls(target);
  if (/[+]/.test(title)) return null;
  const tokens = normalizedTokens(title);
  const candidates = urls.map((url, index) => {
    const haystack = pathTokens(url);
    const matched = tokens.filter((token) => new RegExp(`\\b${token}\\b`).test(haystack));
    const coverage = matched.length / tokens.length;
    const path = url.toLowerCase();
    let score = matched.length * 3 + coverage * 7 - index * 0.00001;
    if (reviewWords.test(path)) score += 8;
    if (/\/(news|guide|guides|feature|interview|video|podcast|walkthrough|deals?|movies-tv|online-slots)\//i.test(path)) score -= 20;
    return {url, score, coverage};
  }).filter((candidate) => candidate.coverage >= (tokens.length <= 2 ? 1 : 0.6))
    .sort((left, right) => right.score - left.score)
    .slice(0, 4);

  for (const candidate of candidates) {
    if (excludedWords.test(candidate.url)) continue;
    if (hasDisambiguationMismatch(title, candidate.url)) continue;
    if (!hasSimpleTitleMatch(title, candidate.url)) continue;
    if (reviewWords.test(candidate.url) && candidate.coverage >= 0.9) return candidate;
    const pageTitle = await getPageTitle(candidate.url);
    const titleText = `${candidate.url} ${pageTitle}`;
    if (!reviewWords.test(titleText)) continue;
    if (excludedWords.test(pageTitle)) continue;
    const titleCoverage = tokens.filter((token) => new RegExp(`\\b${token}\\b`).test(pathTokens(pageTitle))).length / tokens.length;
    if (titleCoverage < (tokens.length <= 3 ? 1 : 0.8)
      && !(titleCoverage === 0 && candidate.coverage >= 0.9 && reviewWords.test(candidate.url))) continue;
    return {...candidate, pageTitle};
  }
  return null;
}

async function findReview(target, title) {
  return {result: await findReviewFromSitemap(target, title)};
}

const rows = await readGames();

const start = Math.max(0, Number(process.argv[2] ?? 0));
const limit = Math.max(0, Number(process.argv[3] ?? rows.length - start));
const end = Math.min(rows.length, start + limit);
const selectedMedia = process.argv[4] ? media.filter((target) => process.argv[4].split(',').includes(target.key)) : media;
const dryRun = process.argv.includes('--dry-run');
const stats = Object.fromEntries(selectedMedia.map((target) => [target.key, {found: 0, notFound: 0, error: 0, skipped: 0}]));

for (let rowIndex = start; rowIndex < end; rowIndex += 1) {
  const row = rows[rowIndex];
  const pending = selectedMedia.filter((target) => {
    if (row[target.field]) {
      stats[target.key].skipped += 1;
      return false;
    }
    return true;
  });
  const outcomes = await Promise.all(pending.map(async (target) => {
    try {
      const {result} = await findReview(target, row.title);
      return {target, result};
    } catch (error) {
      return {target, error};
    }
  }));
  for (const {target, result, error} of outcomes) {
    if (error) {
      stats[target.key].error += 1;
      console.log(`ERROR | ${row.slug} | ${target.label} | ${error.message}`);
    } else if (result) {
      stats[target.key].found += 1;
      if (!dryRun) row[target.field] = result.url;
      console.log(`FOUND | ${row.slug} | ${target.label} | ${result.url}`);
    } else {
      stats[target.key].notFound += 1;
      console.log(`NOT_FOUND | ${row.slug} | ${target.label}`);
    }
  }
  if (!dryRun) await writeGames(rows);
}

console.log(JSON.stringify({rows: `${start + 1}-${end}`, dryRun, stats}, null, 2));
