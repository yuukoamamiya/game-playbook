/** @typedef {{slug: string, title: string, platform: string, score: number|null, releaseYear: number|null, genre: string, metacriticUrl: string, sources: Array<object>, hasTranslation: boolean}} GameRecord */

/**
 * Merge platform records without mutating records or their nested source arrays.
 * @param {GameRecord[]} records
 */
export function mergeGames(records) {
  const merged = new Map();

  for (const game of records) {
    const existing = merged.get(game.slug);
    if (!existing) {
      merged.set(game.slug, {
        ...game,
        sources: [...game.sources],
        platforms: [game.platform],
        platformScores: [{platform: game.platform, score: game.score}],
      });
      continue;
    }

    if (!existing.platforms.includes(game.platform)) existing.platforms.push(game.platform);
    existing.platformScores.push({platform: game.platform, score: game.score});
    const scores = [existing.score, game.score].filter((score) => score != null);
    existing.score = scores.length ? Math.max(...scores) : null;
    existing.releaseYear ??= game.releaseYear;
    existing.metacriticUrl ||= game.metacriticUrl;
    for (const source of game.sources) {
      if (!existing.sources.some((item) => item.site === source.site && item.url === source.url)) {
        existing.sources.push(source);
      }
    }
    existing.hasTranslation ||= game.hasTranslation;
  }

  return [...merged.values()];
}
