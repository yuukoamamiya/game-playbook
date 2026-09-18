import {access} from 'node:fs/promises';
import {basename, resolve} from 'node:path';

import {readGames} from './data-store.mjs';
import {sourceKey} from './media-sources.mjs';
import {docsPath, imagePath, readGameDocuments} from './content-manifest.mjs';

const required = [
  'slug', 'title', 'platform', 'metacritic_score', 'must_play', 'release_year',
  'genre', 'metacritic_url', 'sources', 'content_status', 'notes',
];
const allowedKinds = new Set(['review', 'essay', 'feature', 'score']);
const allowedStatuses = new Set([
  'links-collected', 'manually-added', 'metacritic-filtered', 'metacritic-must-play',
]);
const games = await readGames();
const documents = await readGameDocuments();
const records = new Set();
const errors = [];
const warnings = [];
const emptyGenreRows = [];
const rowsBySlug = new Map();

function error(message) {
  errors.push(message);
}

function warning(message) {
  warnings.push(message);
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function checkNumber(value, label, {min, max, integer = false} = {}) {
  if (value === null) return;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    error(`${label} must be a finite number or null`);
    return;
  }
  if (integer && !Number.isInteger(value)) error(`${label} must be an integer`);
  if (value < min || value > max) error(`${label} must be between ${min} and ${max}`);
}

for (const [index, game] of games.entries()) {
  const row = index + 1;
  for (const field of required) if (!(field in game)) error(`row ${row}: missing ${field}`);

  if (typeof game.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(game.slug)) {
    error(`row ${row}: invalid slug`);
  }
  for (const field of ['title', 'platform', 'genre', 'content_status', 'notes']) {
    if (typeof game[field] !== 'string') error(`row ${row}: ${field} must be a string`);
  }

  const recordKey = `${game.slug}::${game.platform}`;
  if (records.has(recordKey)) error(`row ${row}: duplicate game/platform ${recordKey}`);
  records.add(recordKey);
  if (rowsBySlug.has(game.slug)) rowsBySlug.get(game.slug).push(game);
  else rowsBySlug.set(game.slug, [game]);

  if (typeof game.must_play !== 'boolean') error(`row ${row}: must_play must be boolean`);
  if (!allowedStatuses.has(game.content_status)) {
    error(`row ${row}: unknown content_status ${game.content_status}`);
  }
  checkNumber(game.metacritic_score, `row ${row}: metacritic_score`, {min: 0, max: 100, integer: true});
  checkNumber(game.release_year, `row ${row}: release_year`, {min: 1970, max: 2100, integer: true});

  if (game.metacritic_url && !isHttpUrl(game.metacritic_url)) {
    error(`row ${row}: invalid metacritic_url`);
  }
  if (!game.metacritic_url && game.content_status !== 'manually-added') {
    error(`row ${row}: missing metacritic_url outside manually-added exception`);
  }
  if (!game.genre) emptyGenreRows.push(game.slug);

  if (!Array.isArray(game.sources)) {
    error(`row ${row}: sources must be an array`);
    continue;
  }

  const rowSources = new Set();
  for (const [sourceIndex, source] of game.sources.entries()) {
    const prefix = `row ${row} source ${sourceIndex + 1}`;
    for (const field of ['site', 'kind', 'language', 'url']) {
      if (typeof source?.[field] !== 'string' || !source[field].trim()) {
        error(`${prefix}: missing ${field}`);
      }
    }
    if (source?.site && source.site !== source.site.trim().toLowerCase()) {
      error(`${prefix}: site must be lowercase and trimmed`);
    }
    if (source?.kind && !allowedKinds.has(source.kind)) error(`${prefix}: unknown kind ${source.kind}`);
    if (source?.filter_group !== undefined && (
      typeof source.filter_group !== 'string' || !source.filter_group.trim()
    )) error(`${prefix}: filter_group must be a non-empty string when present`);
    if (source?.url && !isHttpUrl(source.url)) error(`${prefix}: invalid URL`);
    checkNumber(source?.score, `${prefix}: score`, {min: 0, max: 10});
    const key = sourceKey(source ?? {});
    if (rowSources.has(key)) error(`${prefix}: duplicate source ${key}`);
    rowSources.add(key);
  }
}

const expectedDocs = new Set([...rowsBySlug.keys()]);
const seenDocs = new Set();
for (const document of documents) {
  const fileSlug = basename(document.file).replace(/\.mdx?$/, '');
  const {frontmatter, slug, tabs, source} = document;
  if (seenDocs.has(slug)) error(`${document.file}: duplicate document slug ${slug}`);
  seenDocs.add(slug);
  if (!rowsBySlug.has(slug)) error(`${document.file}: no matching game record for ${slug}`);
  if (fileSlug !== slug) error(`${document.file}: filename slug does not match frontmatter slug ${slug}`);
  if (typeof frontmatter.title !== 'string' || !frontmatter.title.trim()) {
    error(`${document.file}: missing title in frontmatter`);
  }
  if (frontmatter.translation_status !== 'translated') {
    warning(`${document.file}: translation_status is ${frontmatter.translation_status ?? '(missing)'}`);
  }

  const imageRef = `/img/reviews-webp/${slug}.webp`;
  if (!source.includes(imageRef)) error(`${document.file}: missing page image ${imageRef}`);
  try { await access(resolve(imagePath, `${slug}.webp`)); }
  catch { error(`${document.file}: image file does not exist for ${slug}`); }

  const knownSites = new Set((rowsBySlug.get(slug) ?? []).flatMap((game) => (
    game.sources.map((item) => item.site)
  )));
  const openingTabs = source.match(/<ReviewTab\b[^>]*>/g)?.length ?? 0;
  const closingTabs = source.match(/<\/ReviewTab>/g)?.length ?? 0;
  if (openingTabs !== closingTabs) error(`${document.file}: unbalanced ReviewTab tags`);
  const wrapperSlugs = [...source.matchAll(/<ReviewTabs\b[^>]*slug="([^"]+)"/g)].map((match) => match[1]);
  if (!wrapperSlugs.length) error(`${document.file}: missing ReviewTabs wrapper`);
  if (wrapperSlugs.some((wrapperSlug) => wrapperSlug !== slug)) {
    error(`${document.file}: ReviewTabs slug does not match ${slug}`);
  }
  const tabIds = new Set();
  for (const [tabIndex, tab] of tabs.entries()) {
    const prefix = `${document.file} tab ${tabIndex + 1}`;
    if (!tab.site) error(`${prefix}: missing site`);
    if (!tab.label) error(`${prefix}: missing label`);
    if (!tab.id) error(`${prefix}: missing id`);
    if (tabIds.has(tab.id)) error(`${prefix}: duplicate id ${tab.id}`);
    tabIds.add(tab.id);
    if (tab.site && !knownSites.has(tab.site)) error(`${prefix}: site ${tab.site} has no source`);
  }
  if (!tabs.length) error(`${document.file}: no ReviewTab entries`);
}

for (const slug of expectedDocs) {
  if (!seenDocs.has(slug)) error(`${slug}: missing document in ${docsPath}`);
}
if (emptyGenreRows.length) {
  warning(`${emptyGenreRows.length} records have an empty genre field`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  if (warnings.length) console.error(`\nWarnings:\n${warnings.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${games.length} game records and ${documents.length} game documents.`);
  if (warnings.length) console.warn(`Warnings:\n${warnings.join('\n')}`);
}
