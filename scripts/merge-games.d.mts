export type GameRecord = {
  slug: string;
  title: string;
  platform: string;
  score: number | null;
  releaseYear: number | null;
  genre: string;
  metacriticUrl: string;
  sources: Array<{
    site: string;
    url: string;
    filter_group?: string;
    kind: string;
    language: string;
    score: number | null;
    versionSlug?: string;
    versionTitle?: string;
  }>;
  hasTranslation: boolean;
};

export type CatalogGame = Omit<GameRecord, 'platform'> & {
  platforms: string[];
  platformScores: Array<{platform: string; score: number | null}>;
};

export function mergeGames(records: GameRecord[]): CatalogGame[];
