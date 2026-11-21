import {readGames, writeGames} from './data-store.mjs';
import {addSource, hasSource} from './media-sources.mjs';
import {fetchText} from './lib/fetch.mjs';
import {decodeHtml, romanMap} from './lib/csv.mjs';
import {cleanHtmlText, normalizedTokens} from './lib/media-search.mjs';
import {parseConcurrency, pool} from './lib/concurrency.mjs';
import {hasFlag, nonNegativeInt, positionalArgs} from './lib/args.mjs';

// TODO(data): move this media table to data/review-media.json once the data
// files are consolidated; keep it here for now to avoid a big diff.
const media = [
  {key: 'pcgamer', domain: 'pcgamer.com', label: 'PC Gamer'},
  {key: 'eurogamer', domain: 'eurogamer.net', label: 'Eurogamer'},
  {key: 'nintendolife', domain: 'nintendolife.com', label: 'Nintendo Life'},
  {key: 'rockpapershotgun', domain: 'rockpapershotgun.com', label: 'Rock Paper Shotgun'},
  {key: 'rpgsite', domain: 'rpgsite.net', label: 'RPG Site'},
  {key: 'adventuregamers', domain: 'adventuregamers.com', base: 'adventuregamers.com', label: 'Adventure Gamers'},
];

const excludedWords = /\b(preview|previews|hands[- ]?on|impressions|news|guide|guides|walkthrough|trailer|video|feature|interview|tips|wiki|攻略|新闻|预览|试玩|deal|sale|best games|release date|patch notes|update|review roundup|movie review|film review|tv review|after[- ]further[- ]review|wrap[- ]up|discussion|online[- ]slots|rave reviews|where['’]?s our review|ai[- ]generated|metacritic|world[- ]of[- ]mods|mod|review[- ]bomb|bombed|being review|mixed steam reviews|steam reviews|working on|translation|on[- ]the[- ]way|quality issues)\b/i;
const reviewWords = /\breview(?:ed|s|ing)?\b|reviews|\brecensione\b/i;
const sitemapCache = new Map();
const pageTitleCache = new Map();

function extractLocations(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => decodeHtml(match[1]));
}

function fetchTextProxied(url) {
  return fetchText(url, {headers: {Accept: 'text/html,application/xml,text/xml'}}, {proxy: true});
}

async function getSitemapArticleUrls(target) {
  if (sitemapCache.has(target.key)) return sitemapCache.get(target.key);
  let articleUrls = [];
  try {
    const root = await fetchTextProxied(`https://${target.base ?? `www.${target.domain}`}/sitemap.xml`);
    const children = extractLocations(root).filter((url) => /sitemap/i.test(url) && /\.xml(?:\.gz)?(?:$|\?)/i.test(url));
    const childResults = await Promise.all(children.map(async (url) => {
      try {
        const xml = await fetchTextProxied(url);
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
      const html = await fetchTextProxied(target.listing);
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
    .replace(/\b(iii|iv|ii|vi|v)\b/g, (value) => romanMap[value] ?? value)
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
  return cleanHtmlText(title);
}

async function getPageTitle(url) {
  if (pageTitleCache.has(url)) return pageTitleCache.get(url);
  try {
    const html = await fetchTextProxied(url);
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

const argv = process.argv.slice(2);
const positional = positionalArgs(argv);
const start = nonNegativeInt(positional[0], 0);
const limit = nonNegativeInt(positional[1], rows.length - start);
const end = Math.min(rows.length, start + limit);
// Optional third positional is a comma-separated media list; flags never land here.
const sitesArg = positional[2] ?? '';
const selectedMedia = sitesArg
  ? media.filter((target) => sitesArg.split(',').includes(target.key))
  : media;
const dryRun = hasFlag(argv, 'dry-run');
// Rows are processed one at a time by default; each row already fans out over
// its pending media. `--concurrency=N` widens that to N rows in flight.
const concurrency = parseConcurrency(argv, 1);
const stats = Object.fromEntries(selectedMedia.map((target) => [target.key, {found: 0, notFound: 0, error: 0, skipped: 0}]));

await pool(rows.slice(start, end), async (row) => {
  const pending = selectedMedia.filter((target) => {
    if (hasSource(row, target.key)) {
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
      if (!dryRun) addSource(row, {site: target.key, kind: 'review', language: 'en', score: null, url: result.url});
      console.log(`FOUND | ${row.slug} | ${target.label} | ${result.url}`);
    } else {
      stats[target.key].notFound += 1;
      console.log(`NOT_FOUND | ${row.slug} | ${target.label}`);
    }
  }
}, {concurrency});

if (!dryRun) await writeGames(rows);
console.log(JSON.stringify({rows: `${start + 1}-${end}`, dryRun, stats}, null, 2));

if (Object.values(stats).some((entry) => entry.error > 0)) process.exitCode = 1;
