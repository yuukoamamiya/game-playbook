import {readdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {getSources} from './media-sources.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = resolve(root, 'data/metacritic-games.json');
const docsPath = resolve(root, 'docs/games');
const outputPath = resolve(root, 'src/generated/games.json');
const reviewsPath = resolve(root, 'src/generated/reviews.json');

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

const rows = JSON.parse(await readFile(dataPath, 'utf8'));
const {translations, media} = await readTranslations();
const games = rows
  .filter((row) => row.must_play === true || String(row.must_play).toLowerCase() === 'true')
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
      sources: getSources(row).map((source) => ({...source, score: numberValue(source.score)})),
      contentStatus: row.content_status || 'links-only',
      hasTranslation: Boolean(translation),
      translationStatus: translation?.status || 'pending',
      translationPath: translation?.path || '',
    };
  });

games.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
await writeFile(outputPath, `${JSON.stringify(games, null, 2)}\n`, 'utf8');
await writeFile(reviewsPath, `${JSON.stringify(Object.fromEntries(media), null, 2)}\n`, 'utf8');
