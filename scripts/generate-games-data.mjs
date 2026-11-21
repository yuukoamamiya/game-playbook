import {mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {numberValue} from './data-store.mjs';
import {getSources, mediaLabels} from './media-sources.mjs';
import {readGameDocuments, translatedTabs} from './content-manifest.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = resolve(root, 'data/metacritic-games.json');
const outputPath = resolve(root, 'src/generated/games.json');
const reviewsPath = resolve(root, 'src/generated/reviews.json');
const mediaLabelsPath = resolve(root, 'src/generated/media-labels.json');
const versionsDir = resolve(root, 'src/generated/versions');
const pageReviewsDir = resolve(root, 'src/generated/reviews');

async function readTranslations() {
  const documents = await readGameDocuments();
  const translations = new Map();
  const media = new Map();

  for (const document of documents) {
    const {frontmatter, slug} = document;
    const entries = translatedTabs(document);
    translations.set(slug, {
      title: frontmatter.display_title || frontmatter.title || '',
      status: frontmatter.translation_status || 'translated',
      path: `docs/games/${document.file}`,
      hasTranslation: entries.length > 0,
    });
    if (entries.length) media.set(slug, entries);
  }

  return {translations, media};
}

const rows = JSON.parse(await readFile(dataPath, 'utf8'));
const {translations, media} = await readTranslations();
const games = rows
  .filter((row) => row.must_play === true || String(row.must_play).toLowerCase() === 'true')
  .map((row) => {
    const pageSlug = row.page_slug || row.slug;
    const translation = translations.get(pageSlug);
    return {
      slug: pageSlug,
      sourceSlug: row.slug,
      title: translation?.title || row.title,
      sourceTitle: row.title,
      versionTitle: row.title,
      platform: row.platform,
      score: numberValue(row.metacritic_score),
      releaseYear: numberValue(row.release_year),
      genre: row.genre,
      metacriticUrl: row.metacritic_url,
      sources: getSources(row).map((source) => ({
        ...source,
        score: numberValue(source.score),
        versionSlug: row.slug,
        versionTitle: row.title,
      })),
      contentStatus: row.content_status ?? null,
      hasTranslation: Boolean(translation?.hasTranslation),
      translationStatus: translation?.status || 'pending',
      translationPath: translation?.path || '',
    };
  });

function compareText(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

// Sort by score, then by the ASCII slug so the output is identical on every
// platform (localeCompare on CJK titles differs between Windows and Linux).
games.sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || compareText(a.slug, b.slug));
await writeFile(outputPath, `${JSON.stringify(games, null, 2)}\n`, 'utf8');
await writeFile(reviewsPath, `${JSON.stringify(Object.fromEntries(media), null, 2)}\n`, 'utf8');

// Per-page slices so the front end can dynamically import one page's data
// instead of the full catalog. Contract: src/generated/<kind>/<pageSlug>.json
// always contains a JSON array.
await rm(versionsDir, {recursive: true, force: true});
await rm(pageReviewsDir, {recursive: true, force: true});
await mkdir(versionsDir, {recursive: true});
await mkdir(pageReviewsDir, {recursive: true});

const versionsBySlug = new Map();
for (const game of games) {
  const versions = versionsBySlug.get(game.slug) ?? [];
  versions.push({
    sourceSlug: game.sourceSlug,
    versionTitle: game.versionTitle,
    platform: game.platform,
    score: game.score,
    releaseYear: game.releaseYear,
    metacriticUrl: game.metacriticUrl,
  });
  versionsBySlug.set(game.slug, versions);
}

for (const [slug, versions] of versionsBySlug) {
  await writeFile(
    resolve(versionsDir, `${slug}.json`),
    `${JSON.stringify(versions, null, 2)}\n`,
    'utf8',
  );
  await writeFile(
    resolve(pageReviewsDir, `${slug}.json`),
    `${JSON.stringify(media.get(slug) ?? [], null, 2)}\n`,
    'utf8',
  );
}

const mediaKeys = new Set([
  ...Object.keys(mediaLabels),
  ...games.flatMap((game) => game.sources.flatMap((source) => (
    [source.site, source.filter_group].filter(Boolean)
  ))),
]);
const labels = Object.fromEntries(
  [...mediaKeys].sort().map((key) => [key, mediaLabels[key] ?? key]),
);
await writeFile(mediaLabelsPath, `${JSON.stringify(labels, null, 2)}\n`, 'utf8');
