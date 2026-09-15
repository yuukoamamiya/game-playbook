const legacyMedia = [
  {site: 'ign', kind: 'review', language: 'en', scoreField: 'ign_score', urlField: 'ign_url'},
  {site: 'gamespot', kind: 'review', language: 'en', scoreField: 'gamespot_score', urlField: 'gamespot_url'},
  {site: 'eurogamer', kind: 'review', language: 'en', urlField: 'eurogamer_url'},
  {site: 'nintendolife', kind: 'review', language: 'en', urlField: 'nintendolife_url'},
  {site: 'rockpapershotgun', kind: 'review', language: 'en', urlField: 'rockpapershotgun_url'},
  {site: 'rpgsite', kind: 'review', language: 'en', urlField: 'rpgsite_url'},
  {site: 'adventuregamers', kind: 'review', language: 'en', urlField: 'adventuregamers_url'},
  {site: 'nintendoworldreport', kind: 'review', language: 'en', urlField: 'nintendoworldreport_url'},
];

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
  return {
    site,
    kind: typeof source.kind === 'string' && source.kind ? source.kind : 'review',
    language: typeof source.language === 'string' && source.language ? source.language : 'en',
    score: Number.isFinite(score) ? score : null,
    url,
  };
}

export function sourcesFromLegacy(row) {
  const collected = [];
  const add = (source) => {
    const normalized = normalizeSource(source);
    if (normalized && !collected.some((item) => sourceKey(item) === sourceKey(normalized))) collected.push(normalized);
  };

  for (const media of legacyMedia) {
    const url = row[media.urlField];
    if (validUrl(url)) add({
      site: media.site,
      kind: media.kind,
      language: media.language,
      score: media.scoreField ? row[media.scoreField] : null,
      url,
    });
  }
  for (const url of Array.isArray(row.famitsu_urls) ? row.famitsu_urls : []) {
    add({site: 'famitsu', kind: 'feature', language: 'ja', score: null, url});
  }
  for (const url of Array.isArray(row.unwinnable_urls) ? row.unwinnable_urls : []) {
    add({site: 'unwinnable', kind: 'essay', language: 'en', score: null, url});
  }
  for (const source of Array.isArray(row.sources) ? row.sources : []) add(source);
  return collected;
}

export function getSources(row) {
  return sourcesFromLegacy(row);
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
  ign: 'IGN',
  gamespot: 'GameSpot',
  eurogamer: 'Eurogamer',
  nintendolife: 'Nintendo Life',
  rockpapershotgun: 'Rock Paper Shotgun',
  rpgsite: 'RPG Site',
  adventuregamers: 'Adventure Gamers',
  nintendoworldreport: 'Nintendo World Report',
  '4gamer': '4Gamer.net',
  famitsu: 'Fami通',
  unwinnable: 'Unwinnable',
  rpgamer: 'RPGamer',
  crpgaddict: 'The CRPG Addict',
  aftermath: 'Aftermath',
  radicalphilosophy: 'Radical Philosophy',
  jesperjuul: 'Jesper Juul',
  theatlantic: 'The Atlantic',
  gamestudies: 'Game Studies',
  todigra: 'ToDiGRA',
  gamesandculture: 'Games and Culture',
};
