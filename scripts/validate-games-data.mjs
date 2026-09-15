import {readGames} from './data-store.mjs';

const required = [
  'slug', 'title', 'platform', 'metacritic_score', 'must_play', 'release_year',
  'genre', 'metacritic_url', 'ign_score', 'ign_url', 'gamespot_score', 'gamespot_url',
  'content_status', 'notes', 'pcgamer_url', 'eurogamer_url', 'nintendolife_url',
  'rockpapershotgun_url', 'rpgsite_url', 'adventuregamers_url', 'nintendoworldreport_url',
];
const urlFields = required.filter((field) => field.endsWith('_url'));
const urlArrayFields = ['famitsu_urls', 'unwinnable_urls'];
const games = await readGames();
const records = new Set();
const errors = [];

for (const [index, game] of games.entries()) {
  for (const field of required) if (!(field in game)) errors.push(`row ${index + 1}: missing ${field}`);
  const recordKey = `${game.slug}::${game.platform}`;
  if (records.has(recordKey)) errors.push(`row ${index + 1}: duplicate game/platform ${recordKey}`);
  records.add(recordKey);
  if (typeof game.must_play !== 'boolean') errors.push(`row ${index + 1}: must_play must be boolean`);
  for (const field of ['metacritic_score', 'release_year', 'ign_score', 'gamespot_score']) {
    if (game[field] !== null && typeof game[field] !== 'number') errors.push(`row ${index + 1}: ${field} must be number or null`);
  }
  for (const field of urlFields) {
    if (game[field] && !/^https?:\/\//.test(game[field])) errors.push(`row ${index + 1}: invalid URL in ${field}`);
  }
  for (const field of urlArrayFields) {
    if (!(field in game)) continue;
    if (!Array.isArray(game[field])) {
      errors.push(`row ${index + 1}: ${field} must be an array`);
      continue;
    }
    for (const url of game[field]) {
      if (typeof url !== 'string' || !/^https?:\/\//.test(url)) errors.push(`row ${index + 1}: invalid URL in ${field}`);
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Validated ${games.length} game records with ${required.length} stable fields.`);
}
