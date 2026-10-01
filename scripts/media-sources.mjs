function validUrl(url) {
  return typeof url === 'string' && /^https?:\/\//.test(url);
}

export function sourceKey(source) {
  return `${source.site}::${source.url}`;
}

export function normalizeSource(source) {
  if (!source || typeof source !== 'object') return null;
  const url = typeof source.url === 'string' ? source.url.trim() : '';
  const site = typeof source.site === 'string' ? source.site.trim().toLowerCase() : '';
  if (!site || !validUrl(url)) return null;
  const score = source.score == null || source.score === '' ? null : Number(source.score);
  const normalized = {
    site,
    kind: typeof source.kind === 'string' && source.kind ? source.kind : 'review',
    language: typeof source.language === 'string' && source.language ? source.language : 'en',
    score: Number.isFinite(score) ? score : null,
    url,
  };
  const filterGroup = typeof source.filter_group === 'string' ? source.filter_group.trim() : '';
  if (filterGroup) normalized.filter_group = filterGroup;
  return normalized;
}

export function getSources(row) {
  const collected = [];
  for (const source of Array.isArray(row?.sources) ? row.sources : []) {
    const normalized = normalizeSource(source);
    if (normalized && !collected.some((item) => sourceKey(item) === sourceKey(normalized))) {
      collected.push(normalized);
    }
  }
  return collected;
}

export function hasSource(row, site) {
  return getSources(row).some((source) => source.site === site);
}

export function addSource(row, source) {
  const normalized = normalizeSource(source);
  if (!normalized) throw new Error(`Invalid media source URL: ${source?.url ?? ''}`);
  const sources = getSources(row);
  if (!sources.some((item) => sourceKey(item) === sourceKey(normalized))) sources.push(normalized);
  row.sources = sources;
  return normalized;
}

export const mediaLabels = {
  scholar: '学者',
  ign: 'IGN',
  gamespot: 'GameSpot',
  eurogamer: 'Eurogamer',
  nintendolife: 'Nintendo Life',
  rockpapershotgun: 'Rock Paper Shotgun',
  rpgsite: 'RPG Site',
  adventuregamers: 'Adventure Gamers',
  rpgfan: 'RPGFan',
  '4gamer': '4Gamer.net',
  unwinnable: 'Unwinnable',
  rpgamer: 'RPGamer',
  aftermath: 'Aftermath',
  radicalphilosophy: 'Radical Philosophy',
  ctheory: 'CTheory',
  jesperjuul: 'Jesper Juul',
  theatlantic: 'The Atlantic',
  gamestudies: 'Game Studies',
  todigra: 'ToDiGRA',
  gamesandculture: 'Games and Culture',
};
