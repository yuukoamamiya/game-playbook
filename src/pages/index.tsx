import {useMemo, useState} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import gamesData from '../generated/games.json';
import styles from './index.module.css';

type SortOrder = 'score' | 'year';

type MediaSource = {
  site: string;
  kind: string;
  language: string;
  score: number | null;
  url: string;
};

type GameRecord = {
  slug: string;
  title: string;
  platform: string;
  score: number;
  releaseYear: number | null;
  genre: string;
  metacriticUrl: string;
  sources: MediaSource[];
  hasTranslation: boolean;
};

type CatalogGame = Omit<GameRecord, 'platform'> & {
  platforms: string[];
};

function mergeGames(records: GameRecord[]): CatalogGame[] {
  const merged = new Map<string, CatalogGame>();

  for (const game of records) {
    const existing = merged.get(game.slug);
    if (!existing) {
      merged.set(game.slug, {...game, platforms: [game.platform]});
      continue;
    }

    if (!existing.platforms.includes(game.platform)) existing.platforms.push(game.platform);
    existing.score = Math.max(existing.score, game.score);
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

const mediaLabels: Record<string, string> = {
  ign: 'IGN',
  gamespot: 'GS',
  eurogamer: 'Eurogamer',
  nintendolife: 'Nintendo Life',
  rockpapershotgun: 'RPS',
  rpgsite: 'RPG Site',
  adventuregamers: 'Adventure Gamers',
  '4gamer': '4Gamer.net',
  famitsu: 'Fami通',
  unwinnable: 'Unwinnable',
  rpgamer: 'RPGamer',
  aftermath: 'Aftermath',
  radicalphilosophy: 'Radical Philosophy',
  theatlantic: 'The Atlantic',
  gamestudies: 'Game Studies',
  todigra: 'ToDiGRA',
  gamesandculture: 'Games and Culture',
};

function ExternalReviewLink({source}: {source: MediaSource}) {
  if (!source.url) return null;
  const label = mediaLabels[source.site] ?? source.site;
  const score = source.score == null ? '' : ` ${source.score}`;
  return (
    <a href={source.url} target="_blank" rel="noreferrer">
      {label}{score} ↗
    </a>
  );
}

export default function Home(): React.ReactNode {
  const games = gamesData as GameRecord[];
  const [platform, setPlatform] = useState('全部平台');
  const [media, setMedia] = useState('全部媒体');
  const [sortOrder, setSortOrder] = useState<SortOrder>('score');
  const platforms = ['全部平台', ...Array.from(new Set(games.map((game) => game.platform)))];
  const catalogGames = useMemo(() => mergeGames(games), [games]);
  const mediaOptions = ['全部媒体', ...Array.from(new Set(
    catalogGames.flatMap((game) => game.sources.map((source) => source.site)),
  ))];
  const translatedCount = catalogGames.filter((game) => game.hasTranslation).length;

  const visibleGames = useMemo(() => mergeGames(games
    .filter((game) => platform === '全部平台' || game.platform === platform)
    .filter((game) => media === '全部媒体' || game.sources.some((source) => source.site === media)))
    .sort((left, right) => {
      if (sortOrder === 'year') {
        return (right.releaseYear ?? 0) - (left.releaseYear ?? 0) || right.score - left.score;
      }
      return right.score - left.score || (right.releaseYear ?? 0) - (left.releaseYear ?? 0);
    }), [games, platform, sortOrder]);

  return (
    <Layout title="游戏橱窗" description="个人游戏评测档案">
      <main className={styles.shelf}>
        <header className={styles.header}>
          <div className={styles.kicker}>GAME PLAYBOOK</div>
          <h1>游戏橱窗</h1>
        </header>

        <section className={styles.summary} aria-label="游戏统计">
          <div><strong>{catalogGames.length}</strong><span>收录游戏</span></div>
          <div><strong>{translatedCount}</strong><span>已有中文译文</span></div>
          <div><strong>{visibleGames.length}</strong><span>当前显示</span></div>
        </section>

        <section className={styles.catalog}>
          <div className={styles.catalogHeading}>
            <h2>游戏列表</h2>
            <div className={styles.controls} aria-label="筛选和排序">
              <label>
                <span>平台</span>
                <select value={platform} onChange={(event) => setPlatform(event.target.value)}>
                  {platforms.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label>
                <span>媒体</span>
                <select value={media} onChange={(event) => setMedia(event.target.value)}>
                  {mediaOptions.map((item) => (
                    <option key={item} value={item}>{mediaLabels[item] ?? item}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>排序</span>
                <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as SortOrder)}>
                  <option value="score">MC 评分</option>
                  <option value="year">出版年份</option>
                </select>
              </label>
            </div>
          </div>

          {visibleGames.length > 0 ? (
            <div className={styles.gameGrid}>
              {visibleGames.map((game) => (
                <article className={styles.gameCard} key={game.slug}>
                  <div className={styles.score}>{game.score}</div>
                  <div className={styles.gameInfo}>
                    <h3>
                      {game.hasTranslation ? (
                        <Link to={`/docs/games/${game.slug}`}>{game.title}</Link>
                      ) : game.title}
                    </h3>
                    <p>{game.releaseYear || '年份待补'} · {game.platforms.join(' · ')}</p>
                    <div className={styles.reviewLinks}>
                      <a href={game.metacriticUrl} target="_blank" rel="noreferrer">MC {game.score} ↗</a>
                      {game.sources.map((source) => (
                        <ExternalReviewLink key={`${source.site}:${source.url}`} source={source} />
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <span className={styles.emptyNumber}>00</span>
              <div>
                <h3>没有符合条件的游戏</h3>
                <p>换一个平台或媒体试试。</p>
              </div>
            </div>
          )}
        </section>
      </main>
    </Layout>
  );
}
