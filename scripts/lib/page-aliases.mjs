/**
 * Validate page_slug relationships independently from the rest of the catalog.
 * A destination may have a document without a same-slug catalog record: some
 * version-only pages intentionally publish a version whose original entry is
 * not in this archive.
 */
export function validatePageAliases(games, documentSlugs) {
  const errors = [];
  const redirectsBySlug = new Map();
  const destinationsBySlug = new Map();

  for (const [index, game] of games.entries()) {
    const row = index + 1;
    const destination = typeof game.page_slug === 'string' ? game.page_slug : game.slug;
    if (typeof game.page_slug === 'string' && game.page_slug === game.slug) {
      errors.push(`row ${row}: page_slug must not reference itself`);
      continue;
    }
    const allDestinations = destinationsBySlug.get(game.slug) ?? new Set();
    allDestinations.add(destination);
    destinationsBySlug.set(game.slug, allDestinations);
    if (typeof game.page_slug !== 'string') continue;

    const destinations = redirectsBySlug.get(game.slug) ?? new Set();
    destinations.add(game.page_slug);
    redirectsBySlug.set(game.slug, destinations);
    if (!documentSlugs.has(game.page_slug)) {
      errors.push(`row ${row}: page_slug target ${game.page_slug} has no document`);
    }
  }

  for (const [slug, destinations] of destinationsBySlug) {
    if (destinations.size > 1) {
      errors.push(`game ${slug}: records point to inconsistent page_slug targets`);
    }
  }

  for (const [slug, destinations] of redirectsBySlug) {
    for (const destination of destinations) {
      if (redirectsBySlug.has(destination)) {
        errors.push(`page ${slug}: page_slug target ${destination} is itself redirected`);
      }
    }
  }

  return errors;
}
