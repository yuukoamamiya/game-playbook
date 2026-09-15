import {readdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const csvPath = resolve(root, 'data/metacritic-games.csv');
const docsPath = resolve(root, 'docs/games');
const outputPath = resolve(root, 'src/generated/games.json');
const reviewsPath = resolve(root, 'src/generated/reviews.json');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(value);
      value = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(value);
      if (row.some((cell) => cell !== '')) rows.push(row);
      row = [];
      value = '';
    } else {
      value += char;
    }
  }

  if (value || row.length > 0) {
    row.push(value);
    if (row.some((cell) => cell !== '')) rows.push(row);
  }

  const [header = [], ...records] = rows;
  return records.map((record) => Object.fromEntries(
    header.map((name, index) => [name, record[index] ?? '']),
  ));
}

function field(frontmatter, name) {
  const match = frontmatter.match(new RegExp(`^${name}:\\s*(.*)$`, 'm'));
  return match?.[1]?.trim().replace(/^['"]|['"]$/g, '') ?? '';
}

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

async function readTranslations() {
  const files = (await readdir(docsPath)).filter((file) => (
    /\.mdx?$/.test(file) && !file.startsWith('_') && file !== 'index.md'
  ));
  const translations = new Map();
  const media = new Map();

  for (const file of files) {
    const source = await readFile(resolve(docsPath, file), 'utf8');
    const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) continue;

    const frontmatter = match[1];
    const slug = field(frontmatter, 'slug') || file.replace(/\.mdx?$/, '');
    translations.set(slug, {
      title: field(frontmatter, 'display_title') || field(frontmatter, 'title'),
      status: field(frontmatter, 'translation_status') || 'translated',
      path: `docs/games/${file}`,
    });

    const entries = [...source.matchAll(/<ReviewTab\s+site="([^"]+)"\s+label="([^"]+)">([\s\S]*?)<\/ReviewTab>/g)]
      .filter((entry) => {
        const content = entry[3];
        const cjk = (content.match(/[\u4e00-\u9fff]/g) ?? []).length;
        return !/待补/.test(content) && cjk >= 30;
      })
      .map((entry) => ({site: entry[1], label: entry[2]}));
    if (entries.length) media.set(slug, entries);
  }

  return {translations, media};
}

const rows = parseCsv(await readFile(csvPath, 'utf8'));
const {translations, media} = await readTranslations();
const games = rows
  .filter((row) => row.must_play.toLowerCase() === 'true' && numberValue(row.metacritic_score) >= 90)
  .map((row) => {
    const translation = translations.get(row.slug);
    return {
      slug: row.slug,
      title: translation?.title || row.title,
      sourceTitle: row.title,
      platform: row.platform,
      score: numberValue(row.metacritic_score),
      releaseYear: numberValue(row.release_year),
      genre: row.genre,
      metacriticUrl: row.metacritic_url,
      ignScore: numberValue(row.ign_score),
      ignUrl: row.ign_url,
      gamespotScore: numberValue(row.gamespot_score),
      gamespotUrl: row.gamespot_url,
      contentStatus: row.content_status || 'links-only',
      hasTranslation: Boolean(translation),
      translationStatus: translation?.status || 'pending',
      translationPath: translation?.path || '',
    };
  });

games.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
await writeFile(outputPath, `${JSON.stringify(games, null, 2)}\n`, 'utf8');
await writeFile(reviewsPath, `${JSON.stringify(Object.fromEntries(media), null, 2)}\n`, 'utf8');
