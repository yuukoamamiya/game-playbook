/**
 * 全站唯一的合并逻辑：把同一 slug 的多个平台记录合并成一张游戏卡片。
 * 首页、`sidebars.ts` 和回归测试都直接使用这份实现。
 *
 * 语义：
 * - score 取所有平台里的最高分；
 * - releaseYear 取最早的非空年份；
 * - metacriticUrl 来自评分最高的那条记录（同分保留先出现的那条）；
 * - platforms / platformScores / sources 去重，sources 按 site+url 判重；
 * - 不修改入参记录，也不修改它们的 sources 数组。
 */

export type MediaSource = {
  site: string;
  filter_group?: string;
  kind: string;
  language: string;
  score: number | null;
  url: string;
  versionTitle?: string;
};

export type GameRecord = {
  slug: string;
  title: string;
  platform: string;
  score: number | null;
  releaseYear: number | null;
  metacriticUrl: string;
  sources: MediaSource[];
  hasTranslation: boolean;
};

export type MergedGame = GameRecord & {
  platforms: string[];
  platformScores: Array<{platform: string; score: number | null}>;
};

function sourceKeyOf(source: MediaSource): string {
  return `${source.site}::${source.url}`;
}

function dedupeSources(sources: readonly MediaSource[]): MediaSource[] {
  const unique = new Map<string, MediaSource>();
  for (const source of sources) {
    const key = sourceKeyOf(source);
    if (!unique.has(key)) unique.set(key, source);
  }
  return [...unique.values()];
}

function highestScore(left: number | null, right: number | null): number | null {
  if (left == null) return right;
  if (right == null) return left;
  return Math.max(left, right);
}

export function mergeGames(records: readonly GameRecord[]): MergedGame[] {
  const merged = new Map<string, MergedGame>();

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
    } else if (
      game.score != null
      && (platformScore.score == null || game.score > platformScore.score)
    ) {
      platformScore.score = game.score;
    }

    // 更高分同时接管页面上的 Metacritic 链接；同分时保留先出现的记录，
    // 结果不随输入顺序翻转而变化。
    if (game.score != null && (existing.score == null || game.score > existing.score)) {
      existing.metacriticUrl = game.metacriticUrl || existing.metacriticUrl;
    }
    existing.score = highestScore(existing.score, game.score);

    if (
      game.releaseYear != null
      && (existing.releaseYear == null || game.releaseYear < existing.releaseYear)
    ) {
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
    existing.hasTranslation = existing.hasTranslation || game.hasTranslation;
  }

  return [...merged.values()];
}
