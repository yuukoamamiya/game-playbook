import {dataPath, readGames, writeGames} from './data-store.mjs';
import {addSource, hasSource} from './media-sources.mjs';
import {fetchWithTimeout} from './lib/fetch.mjs';
import {parseBingResults} from './lib/media-search.mjs';
import {hasFlag, nonNegativeInt, positionalArgs} from './lib/args.mjs';

function titleTokens(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/gi, ' ').split(/\s+/).filter((token) => token.length > 2);
}

function chooseReview(results, title) {
  const tokens = titleTokens(title);
  const ranked = results.map((result, index) => {
    const haystack = `${result.url} ${result.title}`.toLowerCase();
    const overlap = tokens.filter((token) => haystack.includes(token)).length;
    let score = overlap * 2 - index * 0.01;
    if (/\breview\b/i.test(result.title) || /review/i.test(result.url)) score += 8;
    if (/\b(preview|hands-on|news|guide|walkthrough|trailer|deal|best)\b/i.test(result.title)) score -= 12;
    return { ...result, score };
  }).sort((left, right) => right.score - left.score);
  return ranked[0] && ranked[0].score >= 4 ? ranked[0] : null;
}

async function findReview(domain, title) {
  const section = domain === 'ign.com' ? 'articles' : 'reviews';
  const query = `site:${domain}/${section} "${title}" review`;
  const response = await fetchWithTimeout(`https://www.bing.com/search?q=${encodeURIComponent(query)}`, {}, {timeoutMs: 30000});
  if (!response.ok) return { query, result: null };
  const html = await response.text();
  return { query, result: chooseReview(parseBingResults(html, {domain, section}), title) };
}

const rows = await readGames();
const argv = process.argv.slice(2);
const positional = positionalArgs(argv);
const start = nonNegativeInt(positional[0], 0);
const limit = nonNegativeInt(positional[1], rows.length - start);
const end = Math.min(rows.length, start + limit);
const dryRun = hasFlag(argv, 'dry-run');
let changed = 0;
let failed = 0;

// Kept sequential on purpose: Bing throttles parallel scrapes and the report is
// easier to read in row order.
for (const row of rows.slice(start, end)) {
  const targets = [
    ['ign.com', 'ign'],
    ['gamespot.com', 'gamespot'],
  ];
  let added = false;
  for (const [domain, field] of targets) {
    if (hasSource(row, field)) continue;
    try {
      const { result } = await findReview(domain, row.title);
      if (result) {
        if (!dryRun) {
          addSource(row, {site: field, kind: 'review', language: 'en', score: null, url: result.url});
        }
        changed += 1;
        added = true;
        console.log(`${row.platform} | ${row.title} | ${field} | ${result.url}`);
      } else {
        console.log(`${row.platform} | ${row.title} | ${field} | NOT_FOUND`);
      }
    } catch (error) {
      failed += 1;
      console.log(`${row.platform} | ${row.title} | ${field} | ERROR: ${error.message}`);
    }
  }
  // Adding a link does not change how a manually-added record entered the
  // catalog, and rows with no new link keep their existing provenance.
  if (added && !dryRun && row.content_status !== 'manually-added') {
    row.content_status = 'links-collected';
  }
}

if (!dryRun && changed) await writeGames(rows);
console.log(`${dryRun ? 'Would update' : 'Updated'} ${changed} review links in ${dataPath} (rows ${start + 1}-${end})`);
if (failed) {
  console.error(`${failed} lookups failed`);
  process.exitCode = 1;
}
