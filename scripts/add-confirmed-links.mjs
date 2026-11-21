import {readFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readGames, writeGames} from './data-store.mjs';
import {addSource, getSources, sourceKey} from './media-sources.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const confirmedLinksPath = resolve(root, 'data/confirmed-links.json');

function hasConfirmedSource(row, entry) {
  return getSources(row).some((source) => sourceKey(source) === `${entry.site}::${entry.url}`);
}

/**
 * Apply the manually confirmed article links from data/confirmed-links.json.
 *
 * `sites` limits the run to a subset (the legacy per-site wrappers use this);
 * `dryRun` reports what would change without touching the data file.
 */
export async function runConfirmedLinks({sites = [], dryRun = false} = {}) {
  const entries = JSON.parse(await readFile(confirmedLinksPath, 'utf8'));
  if (!Array.isArray(entries)) throw new Error(`${confirmedLinksPath} must contain a JSON array`);

  const onlySites = new Set(sites.filter(Boolean));
  const rows = await readGames();
  const rowsBySlug = new Map();
  for (const row of rows) {
    const bucket = rowsBySlug.get(row.slug) ?? [];
    bucket.push(row);
    rowsBySlug.set(row.slug, bucket);
  }

  const stats = {entries: 0, added: 0, skipped: 0};
  const missingSlugs = new Set();
  for (const entry of entries) {
    if (!entry?.slug || !entry?.site || !entry?.url) {
      throw new Error(`${confirmedLinksPath}: every entry needs slug, site and url`);
    }
    if (onlySites.size && !onlySites.has(entry.site)) continue;
    stats.entries += 1;
    const targets = rowsBySlug.get(entry.slug) ?? [];
    if (!targets.length) {
      missingSlugs.add(entry.slug);
      continue;
    }
    for (const row of targets) {
      if (hasConfirmedSource(row, entry)) {
        stats.skipped += 1;
        continue;
      }
      stats.added += 1;
      if (!dryRun) {
        addSource(row, {
          site: entry.site,
          kind: entry.kind ?? 'review',
          language: entry.language ?? 'en',
          score: entry.score ?? null,
          url: entry.url,
        });
      }
    }
  }

  // Writing once at the end keeps the checkpoint idempotent: a second run finds
  // every link already present and leaves the file untouched.
  if (!dryRun && stats.added) await writeGames(rows);

  console.log(JSON.stringify({
    dryRun,
    sites: onlySites.size ? [...onlySites] : 'all',
    ...stats,
    missingSlugs: [...missingSlugs],
  }, null, 2));
  if (missingSlugs.size) process.exitCode = 1;
  return stats;
}

async function main() {
  const args = process.argv.slice(2);
  const sites = (args.find((arg) => arg.startsWith('--site='))?.slice('--site='.length) ?? '')
    .split(',').map((site) => site.trim()).filter(Boolean);
  await runConfirmedLinks({sites, dryRun: args.includes('--dry-run')});
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
