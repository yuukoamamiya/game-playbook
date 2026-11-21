import {getSources} from '../media-sources.mjs';

export function getIgnTargets(rows) {
  const targets = [];
  const seenSlugs = new Set();

  for (const row of rows) {
    const sourceUrl = getSources(row).find((source) => source.site === 'ign')?.url ?? '';
    if (!sourceUrl || !sourceUrl.includes('ign.com')) continue;
    if (seenSlugs.has(row.slug)) continue;
    seenSlugs.add(row.slug);
    targets.push({row, sourceUrl});
  }

  return targets;
}
