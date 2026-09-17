import {readdir, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {readGames, writeGames} from './data-store.mjs';
import {getSources} from './media-sources.mjs';

const legacyFields = [
  'ign_score', 'ign_url', 'gamespot_score', 'gamespot_url',
  'pcgamer_url', 'eurogamer_url', 'nintendolife_url', 'rockpapershotgun_url',
  'rpgsite_url', 'adventuregamers_url',
  'famitsu_urls', 'unwinnable_urls',
];

const rows = await readGames();
for (const row of rows) {
  row.sources = getSources(row);
  for (const field of legacyFields) delete row[field];
}
await writeGames(rows);

const docsPath = resolve(process.cwd(), 'docs/games');
const files = (await readdir(docsPath)).filter((file) => /\.mdx?$/.test(file) && !file.startsWith('_'));
let updatedDocs = 0;
for (const file of files) {
  const path = resolve(docsPath, file);
  const source = await readFile(path, 'utf8');
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) continue;
  const lines = match[1].split(/\r?\n/);
  const kept = lines.filter((line) => !/^(ign_score|ign_url|gamespot_score|gamespot_url):/.test(line));
  if (kept.length !== lines.length) {
    await writeFile(path, `${source.slice(0, match.index) }---\n${kept.join('\n')}\n---${source.slice(match.index + match[0].length)}`, 'utf8');
    updatedDocs += 1;
  }
}
console.log(`Migrated ${rows.length} game records and ${updatedDocs} document frontmatters to sources.`);
