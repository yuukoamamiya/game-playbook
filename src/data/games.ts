export type Game = {
  title: string;
  score: number;
  releaseYear: number;
  platforms: string[];
  genre: string;
  note?: string;
};

/**
 * 游戏橱窗的唯一数据入口。
 * 后续新增游戏时，在这里添加一条记录；首页会自动生成卡片和统计数字。
 */
export const games: Game[] = [];
