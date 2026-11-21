// Shared helpers for the Bing-based link collectors.
//
// `collect-review-links.mjs` and `collect-additional-review-links.mjs` used to
// carry separate copies of the result parser and token normaliser. Keep the
// parsing primitives here; the two scripts still own their ranking rules,
// because they target different media and have different thresholds.

import {decodeHtml, normalizeUnicode, romanMap} from './csv.mjs';

/** Strip tags, decode entities and collapse whitespace in a search-result cell. */
export function cleanHtmlText(value) {
  return decodeHtml(value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
}

/**
 * Resolve a Bing result href to the real URL.
 *
 * Bing wraps outbound links in `/ck/a?...&u=a1<base64>`. Older copies of this
 * helper differed in whether they decoded entities first; do that here so both
 * collectors handle `&amp;` and wrapped links the same way.
 */
export function extractBingTargetUrl(href) {
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

/**
 * Parse Bing organic results for one domain.
 *
 * `section` optionally restricts matches to a path prefix such as `articles`
 * (IGN) or `reviews` (GameSpot); omit it when the site has no such section.
 */
export function parseBingResults(html, {domain, section, snippetLength = 6000} = {}) {
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
    if (!(parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`))) continue;
    if (section) {
      const prefix = `/${section}`;
      if (parsed.pathname !== prefix && !parsed.pathname.startsWith(`${prefix}/`)) continue;
    }

    const itemStart = Math.max(0, match.index ?? 0);
    const item = html.slice(itemStart, Math.min(html.length, itemStart + snippetLength));
    const title = cleanHtmlText(match[2]);
    const snippet = cleanHtmlText(item.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? '');
    const canonical = `${parsed.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (!results.some((result) => result.url === canonical)) {
      results.push({url: canonical, title, snippet});
    }
  }

  return results;
}

/** Lowercase alphanumeric tokens with common stop words and Roman numerals folded. */
export function normalizedTokens(title) {
  const normalized = normalizeUnicode(title).toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b(iii|iv|ii|vi|v)\b/g, (value) => romanMap[value] ?? value)
    .replace(/[^a-z0-9]+/g, ' ');
  return normalized.split(/\s+/).filter((token) => (
    (token.length > 1 || /^\d$/.test(token))
    && !['the', 'a', 'an', 'of', 'and', 'edition', 'definitive', 'version', 'game'].includes(token)
  ));
}
