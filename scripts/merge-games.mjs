/** @typedef {{slug: string, title: string, platform: string, score: number|null, releaseYear: number|null, genre: string, metacriticUrl: string, sources: Array<object>, hasTranslation: boolean}} GameRecord */

function sourceKeyOf(source) {
  return `${source.site}::${source.url}`;
}

function dedupeSources(sources) {
  const unique = new Map();
  for (const source of sources) {
    const key = sourceKeyOf(source);
    if (!unique.has(key)) unique.set(key, source);
  }
  return [...unique.values()];
}

/**
 * Merge platform records without mutating records or their nested source arrays.
 *
 * Page-level facts follow the best record, not the first one:
 * - releaseYear keeps the earliest known year;
 * - metacriticUrl comes from the highest-scoring record (first one wins a tie);
 * - score keeps the highest score;
 * - platforms/platformScores and sources are de-duplicated.
 *
 * @param {GameRecord[]} records
 */
export function mergeGames(records) {
  const merged = new Map();

  for (const game of records) {
    const existing = merged.get(game.slug);
    if (!existing) {
      merged.set(game.slug, {
        ...game,
        sources: dedupeSources(game.sources),
        platforms: [game.platform],
        platformScores: [{platform: game.platform, score: game.score}],
      });
      continue;
    }

    if (!existing.platforms.includes(game.platform)) existing.platforms.push(game.platform);
    const platformScore = existing.platformScores.find((item) => item.platform === game.platform);
    if (!platformScore) {
      existing.platformScores.push({platform: game.platform, score: game.score});
    } else if (game.score != null && (platformScore.score == null || game.score > platformScore.score)) {
      platformScore.score = game.score;
    }

    // A higher score also becomes the page's Metacritic link. Ties keep the URL
    // of the first record so the result does not depend on input order reversals.
    if (game.score != null && (existing.score == null || game.score > existing.score)) {
      existing.metacriticUrl = game.metacriticUrl || existing.metacriticUrl;
    }
    const scores = [existing.score, game.score].filter((score) => score != null);
    existing.score = scores.length ? Math.max(...scores) : null;

    if (game.releaseYear != null
      && (existing.releaseYear == null || game.releaseYear < existing.releaseYear)) {
      existing.releaseYear = game.releaseYear;
    }

    const sourceKeys = new Set(existing.sources.map(sourceKeyOf));
    for (const source of game.sources) {
      const key = sourceKeyOf(source);
      if (!sourceKeys.has(key)) {
        sourceKeys.add(key);
        existing.sources.push(source);
      }
    }
    existing.hasTranslation ||= game.hasTranslation;
  }

  return [...merged.values()];
}
