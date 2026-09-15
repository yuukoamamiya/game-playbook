import {dataPath, readGames, writeGames} from './data-store.mjs';
const userAgent = 'Mozilla/5.0 (compatible; GamePlaybookResearch/1.0)';

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
  return value.replaceAll('&amp;', '&').replaceAll('&#39;', "'").replaceAll('&quot;', '"');
}

function extractTargetUrl(href) {
  const encoded = href.match(/\/RU=([^/]+)\/RK=/)?.[1];
  if (!encoded) return '';
  try {
    const decoded = decodeURIComponent(encoded);
    return decoded.startsWith('http') ? decoded : '';
  } catch {
    return '';
  }
}

function cleanText(value) {
  return decodeHtml(value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
}

function extractBingTargetUrl(href) {
  try {
    const encoded = new URL(href).searchParams.get('u') ?? '';
    if (!encoded.startsWith('a1')) return href;
    const decoded = Buffer.from(encoded.slice(2), 'base64').toString('utf8');
    return decoded.startsWith('http') ? decoded : href;
  } catch {
    return href;
  }
}

function parseSearchResults(html, domain, section) {
  const results = [];
  const anchorPattern = /<li[^>]+class="[^"]*b_algo[^"]*"[\s\S]*?<h2><a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  for (const match of html.matchAll(anchorPattern)) {
    const url = extractBingTargetUrl(decodeHtml(match[1]));
    const text = cleanText(match[2]);
    if (!url || !url.includes(`${domain}/${section}`)) continue;
    if (results.some((result) => result.url === url)) continue;
    results.push({ url, text });
  }
  return results;
}

function titleTokens(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/gi, ' ').split(/\s+/).filter((token) => token.length > 2);
}

function chooseReview(results, title) {
  const tokens = titleTokens(title);
  const ranked = results.map((result, index) => {
    const haystack = `${result.url} ${result.text}`.toLowerCase();
    const overlap = tokens.filter((token) => haystack.includes(token)).length;
    let score = overlap * 2 - index * 0.01;
    if (/\breview\b/i.test(result.text) || /review/i.test(result.url)) score += 8;
    if (/\b(preview|hands-on|news|guide|walkthrough|trailer|deal|best)\b/i.test(result.text)) score -= 12;
    return { ...result, score };
  }).sort((left, right) => right.score - left.score);
  return ranked[0] && ranked[0].score >= 4 ? ranked[0] : null;
}

async function findReview(domain, title) {
  const section = domain === 'ign.com' ? 'articles' : 'reviews';
  const query = `site:${domain}/${section} "${title}" review`;
  const response = await fetch(`https://www.bing.com/search?q=${encodeURIComponent(query)}`, {
    headers: { 'User-Agent': userAgent },
  });
  if (!response.ok) return { query, result: null };
  const html = await response.text();
  return { query, result: chooseReview(parseSearchResults(html, domain, section), title) };
}

const rows = await readGames();
const start = Number(process.argv[2] ?? 0);
const limit = Number(process.argv[3] ?? rows.length - start);
const end = Math.min(rows.length, start + limit);
let changed = 0;

for (const row of rows.slice(start, end)) {
  const targets = [
    ['ign.com', 'ign_url'],
    ['gamespot.com', 'gamespot_url'],
  ];
  for (const [domain, field] of targets) {
    if (row[field]) continue;
    try {
      const { result } = await findReview(domain, row.title);
      if (result) {
        row[field] = result.url;
        changed += 1;
        console.log(`${row.platform} | ${row.title} | ${field} | ${result.url}`);
      } else {
        console.log(`${row.platform} | ${row.title} | ${field} | NOT_FOUND`);
      }
    } catch (error) {
      console.log(`${row.platform} | ${row.title} | ${field} | ERROR: ${error.message}`);
    }
  }
  if (row.ign_url || row.gamespot_url) row.content_status = 'links-collected';
  await writeGames(rows);
}

await writeGames(rows);
console.log(`Updated ${changed} review links in ${dataPath} (rows ${start + 1}-${end})`);
