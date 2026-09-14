import {readdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const docsPath = resolve(root, 'docs/games');
const outputPath = resolve(root, 'src/generated/games.json');

function field(frontmatter, name) {
  const match = frontmatter.match(new RegExp(`^${name}:\\s*(.*)$`, 'm'));
  return match?.[1]?.trim().replace(/^['"]|['"]$/g, '') ?? '';
}

function numberField(frontmatter, name) {
  const value = Number(field(frontmatter, name));
  return Number.isFinite(value) && value > 0 ? value : null;
}

const files = (await readdir(docsPath)).filter((file) => /\.mdx?$/.test(file) && !file.startsWith('_') && file !== 'index.md');
const games = [];

for (const file of files) {
  const source = await readFile(resolve(docsPath, file), 'utf8');
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) continue;

  const frontmatter = match[1];
  const score = numberField(frontmatter, 'metacritic_score');
  if (field(frontmatter, 'must_play').toLowerCase() !== 'true' || !score || score < 90) continue;

  games.push({
    slug: field(frontmatter, 'slug') || file.replace(/\.mdx?$/, ''),
    title: field(frontmatter, 'title'),
    platform: field(frontmatter, 'platform'),
    score,
    releaseYear: numberField(frontmatter, 'release_year'),
    genre: field(frontmatter, 'genre'),
    metacriticUrl: field(frontmatter, 'metacritic_url'),
    ignScore: numberField(frontmatter, 'ign_score'),
    ignUrl: field(frontmatter, 'ign_url'),
    gamespotScore: numberField(frontmatter, 'gamespot_score'),
    gamespotUrl: field(frontmatter, 'gamespot_url'),
    contentStatus: field(frontmatter, 'content_status') || 'links-only',
    notes: field(frontmatter, 'notes'),
  });
}

games.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
await writeFile(outputPath, `${JSON.stringify(games, null, 2)}\n`);
