import {readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const dataPath = resolve(root, 'data/metacritic-games.json');

export async function readGames() {
  const games = JSON.parse(await readFile(dataPath, 'utf8'));
  if (!Array.isArray(games)) throw new Error(`${dataPath} must contain a JSON array`);
  return games;
}

export async function writeGames(games) {
  await writeFile(dataPath, `${JSON.stringify(games, null, 2)}\n`, 'utf8');
}
