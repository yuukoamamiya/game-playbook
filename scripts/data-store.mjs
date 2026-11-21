import {readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export {root};
export const dataPath = resolve(root, 'data/metacritic-games.json');

/**
 * Convert a data-file value to a non-negative number. Zero is a valid value
 * (a Metacritic score can be 0); missing/invalid values become null.
 *
 * `Number(null)` and `Number('')` are 0, which would turn "unknown" into a
 * real zero, so those inputs are rejected before conversion.
 */
export function numberValue(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export async function readGames() {
  const games = JSON.parse(await readFile(dataPath, 'utf8'));
  if (!Array.isArray(games)) throw new Error(`${dataPath} must contain a JSON array`);
  return games;
}

export async function writeGames(games) {
  await writeFile(dataPath, `${JSON.stringify(games, null, 2)}\n`, 'utf8');
}
