import {readGames} from './data-store.mjs';
import {getSources} from './media-sources.mjs';

const required = [
  'slug', 'title', 'platform', 'metacritic_score', 'must_play', 'release_year',
  'genre', 'metacritic_url', 'sources', 'content_status', 'notes',
];
const games = await readGames();
const records = new Set();
const errors = [];

for (const [index, game] of games.entries()) {
  for (const field of required) if (!(field in game)) errors.push(`row ${index + 1}: missing ${field}`);
  const recordKey = `${game.slug}::${game.platform}`;
  if (records.has(recordKey)) errors.push(`row ${index + 1}: duplicate game/platform ${recordKey}`);
  records.add(recordKey);
  if (typeof game.must_play !== 'boolean') errors.push(`row ${index + 1}: must_play must be boolean`);
  for (const field of ['metacritic_score', 'release_year']) {
    if (game[field] !== null && typeof game[field] !== 'number') errors.push(`row ${index + 1}: ${field} must be number or null`);
  }
  if (!Array.isArray(game.sources)) {
    errors.push(`row ${index + 1}: sources must be an array`);
  } else {
    const rowSources = new Set();
    for (const [sourceIndex, source] of game.sources.entries()) {
      const prefix = `row ${index + 1} source ${sourceIndex + 1}`;
      for (const field of ['site', 'kind', 'language', 'url']) {
        if (typeof source?.[field] !== 'string' || !source[field]) errors.push(`${prefix}: missing ${field}`);
      }
      if ('filter_group' in source && (typeof source.filter_group !== 'string' || !source.filter_group)) {
        errors.push(`${prefix}: filter_group must be a non-empty string when present`);
      }
      if (source?.url && !/^https?:\/\//.test(source.url)) errors.push(`${prefix}: invalid URL`);
      if (source?.score !== null && (typeof source?.score !== 'number' || !Number.isFinite(source.score))) errors.push(`${prefix}: score must be number or null`);
      const key = `${source?.site}::${source?.url}`;
      if (rowSources.has(key)) errors.push(`${prefix}: duplicate source ${key}`);
      rowSources.add(key);
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Validated ${games.length} game records with extensible media sources.`);
}
