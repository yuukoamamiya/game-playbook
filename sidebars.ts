import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';
import {mergeGames, type GameRecord} from './src/lib/mergeGames';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

type GamePage = {
  slug: string;
  score: number | null;
  year: number | null;
};

type YearCategory = {
  type: 'category';
  label: string;
  collapsible: boolean;
  collapsed: boolean;
  items: {type: 'doc'; id: string}[];
};

// src/generated/games.json is written by `npm run generate-data` from
// data/metacritic-games.json, so the sidebar follows the data instead of the
// alphabetical order of the doc filenames.
const generatedGamesPath = resolve(__dirname, 'src/generated/games.json');
let games: GameRecord[];
try {
  games = JSON.parse(readFileSync(generatedGamesPath, 'utf8')) as GameRecord[];
} catch (error) {
  throw new Error(
    `无法读取 ${generatedGamesPath}，先跑 npm run generate-data 生成前台数据`
    + `（${error instanceof Error ? error.message : String(error)}）`,
  );
}

// A public page can cover several platform records (via page_slug); list it
// once, dated by its earliest release year and ranked by its best score.
// Reuse the home page's merge so sidebar ordering cannot drift from the catalog.
const pages: GamePage[] = mergeGames(games).map((game) => ({
  slug: game.slug,
  score: game.score,
  year: game.releaseYear,
}));

const gamesByYear = new Map<number | 'unknown', GamePage[]>();
for (const page of pages) {
  const key = page.year ?? 'unknown';
  const list = gamesByYear.get(key) ?? [];
  list.push(page);
  gamesByYear.set(key, list);
}

function compareText(a: string, b: string) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function toCategory(label: string, list: GamePage[]): YearCategory {
  return {
    type: 'category',
    label,
    collapsible: true,
    collapsed: true,
    // Within a year the higher Metacritic score comes first; the ASCII slug
    // breaks ties so the order stays identical on every platform.
    items: [...list]
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || compareText(a.slug, b.slug))
      .map((game) => ({type: 'doc', id: `games/${game.slug}`})),
  };
}

const yearCategories: YearCategory[] = [...gamesByYear.keys()]
  .filter((key): key is number => typeof key === 'number')
  .sort((a, b) => b - a)
  .map((year) => toCategory(String(year), gamesByYear.get(year)!));

const unknownYear = gamesByYear.get('unknown');
if (unknownYear) {
  yearCategories.push(toCategory('年份未知', unknownYear));
}

const sidebars: SidebarsConfig = {
  librarySidebar: [{type: 'doc', id: 'games/index'}, ...yearCategories],
};

export default sidebars;
