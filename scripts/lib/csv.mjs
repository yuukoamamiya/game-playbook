// Shared text helpers for the collection scripts.
//
// The collectors used to carry their own copies of these helpers (CSV cells,
// HTML entity decoding, slug tokenisation). Keep the canonical versions here so
// a fix in one place reaches every script.

const namedEntities = {
  amp: '&',
  apos: "'",
  copy: '\u00a9',
  gt: '>',
  hellip: '\u2026',
  ldquo: '\u201c',
  lsquo: '\u2018',
  lt: '<',
  mdash: '\u2014',
  nbsp: ' ',
  ndash: '\u2013',
  quot: '"',
  rdquo: '\u201d',
  rsquo: '\u2019',
};

export const romanMap = {i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8', ix: '9', x: '10'};

/** Normalise typographic Unicode (full-width forms, curly quotes, dashes). */
export function normalizeUnicode(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00a0/g, ' ');
}

/** Split one CSV line, honouring quoted cells and doubled quotes. */
export function parseCsvLine(line) {
  const values = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && quoted && line[index + 1] === '"') {
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

/** Decode the HTML entities the collectors actually meet. */
export function decodeHtml(value) {
  return String(value ?? '').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code) => {
    if (code[0] === '#') {
      const hex = code[1] === 'x' || code[1] === 'X';
      const number = Number.parseInt(hex ? code.slice(2) : code.slice(1), hex ? 16 : 10);
      return Number.isFinite(number) ? String.fromCodePoint(number) : match;
    }
    return namedEntities[code.toLowerCase()] ?? match;
  });
}

/** Drop a trailing plural "s" so title and slug tokens line up. */
export function stem(token) {
  return token.length > 4 && token.endsWith('s') && !token.endsWith('ss') ? token.slice(0, -1) : token;
}

/** Stem a token and fold Roman numerals onto digits. */
export function normalizeToken(token) {
  const stemmed = stem(token);
  return romanMap[stemmed] ?? stemmed;
}

/** Lowercase word tokens used for title/slug matching. */
export function tokenize(text, stopWords = new Set()) {
  return normalizeUnicode(text)
    .toLowerCase()
    .replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(normalizeToken)
    .filter((token) => (token.length >= 2 || /^\d+$/.test(token)) && !stopWords.has(token));
}
