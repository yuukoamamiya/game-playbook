import React, {useMemo, useState} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import gamesData from '../generated/games.json';
import mediaLabelsData from '../generated/media-labels.json';
import {mergeGames, type GameRecord, type MediaSource, type MergedGame} from '../lib/mergeGames';
import styles from './index.module.css';

const SORT_ORDERS = ['score', 'year'] as const;
type SortOrder = (typeof SORT_ORDERS)[number];

const ALL_PLATFORMS = '全部平台';
const ALL_MEDIA = '全部媒体';

const mediaLabels = mediaLabelsData as Record<string, string>;

// 静态数据只在模块加载时读取一次，避免每次渲染都重新断言。
const games = gamesData as GameRecord[];

function isSortOrder(value: string): value is SortOrder {
  return (SORT_ORDERS as readonly string[]).includes(value);
}

// 媒体/平台是稳定的 ASCII 标识，按码位排序比 localeCompare 更可预测，
// 也不会因为运行环境的 ICU 数据不同而出现顺序抖动。
function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function mediaFilterKey(source: MediaSource): string {
  return source.filter_group || source.site;
}

const ExternalReviewLink = React.memo(function ExternalReviewLink({source}: {source: MediaSource}) {
  if (!source.url) return null;
  const label = mediaLabels[source.site] ?? source.site;
  const score = source.score == null ? '' : ` ${source.score}`;
  return (
    <a href={source.url} target="_blank" rel="noopener noreferrer" title={source.versionTitle}>
      {label}{score} ↗
    </a>
  );
});

const GameCard = React.memo(function GameCard({game}: {game: MergedGame}) {
  const scorePlatforms = game.score == null
    ? []
    : game.platformScores.filter((item) => item.score === game.score).map((item) => item.platform);

  return (
    <article className={styles.gameCard}>
      <div
        className={styles.score}
        role="img"
        aria-label={game.score == null ? '暂无 Metacritic 评分' : `Metacritic 评分 ${game.score}`}
      >
        {game.score ?? '—'}
      </div>
      <div className={styles.gameInfo}>
        <h3>
          {game.hasTranslation ? (
            <Link to={`/docs/games/${game.slug}`}>{game.title}</Link>
          ) : game.title}
        </h3>
        <p>
          {game.releaseYear || '年份待补'} · {game.platforms.join(' · ')}
          {scorePlatforms.length > 0 && (
            <> · MC {game.score}（{scorePlatforms.join(' / ')}）</>
          )}
        </p>
        <div className={styles.reviewLinks}>
          {game.metacriticUrl && game.score != null && (
            <a href={game.metacriticUrl} target="_blank" rel="noopener noreferrer">
              MC {game.score} ↗
            </a>
          )}
          {game.sources.map((source) => (
            <ExternalReviewLink key={`${source.site}:${source.url}`} source={source} />
          ))}
        </div>
      </div>
    </article>
  );
});

export default function Home(): React.ReactNode {
  const [platform, setPlatform] = useState(ALL_PLATFORMS);
  const [mediaSelection, setMediaSelection] = useState(ALL_MEDIA);
  const [sortOrder, setSortOrder] = useState<SortOrder>('score');

  const platforms = useMemo(
    () => [ALL_PLATFORMS, ...Array.from(new Set(games.map((game) => game.platform))).sort(compareText)],
    [],
  );

  const {catalogGames, translatedCount} = useMemo(() => {
    const merged = mergeGames(games);
    return {
      catalogGames: merged,
      translatedCount: merged.filter((game) => game.hasTranslation).length,
    };
  }, []);

  const platformGames = useMemo(
    () => games.filter((game) => platform === ALL_PLATFORMS || game.platform === platform),
    [platform],
  );

  const mediaOptions = useMemo(
    () => [ALL_MEDIA, ...Array.from(new Set(
      platformGames.flatMap((game) => game.sources.map(mediaFilterKey)),
    )).sort(compareText)],
    [platformGames],
  );

  // 平台切换后旧媒体可能已不在选项里，直接用派生值回退，避免 effect 先渲染
  // 一次不存在的选项再重置（那会造成选中项闪烁）。
  const media = mediaOptions.includes(mediaSelection) ? mediaSelection : ALL_MEDIA;

  const visibleGames = useMemo(() => mergeGames(platformGames.filter(
    (game) => media === ALL_MEDIA || game.sources.some((source) => mediaFilterKey(source) === media),
  )).sort((left, right) => {
    // mergeGames 返回新数组，这里的 sort 不会改动静态数据。
    if (sortOrder === 'year') {
      return (right.releaseYear ?? 0) - (left.releaseYear ?? 0)
        || (right.score ?? -1) - (left.score ?? -1);
    }
    return (right.score ?? -1) - (left.score ?? -1) || (right.releaseYear ?? 0) - (left.releaseYear ?? 0);
  }), [media, platformGames, sortOrder]);

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
          <div aria-live="polite"><strong>{visibleGames.length}</strong><span>当前显示</span></div>
        </section>

        <section className={styles.catalog}>
          <div className={styles.catalogHeading}>
            <h2>游戏列表</h2>
            <div className={styles.controls} role="group" aria-label="筛选和排序">
              <label>
                <span>平台</span>
                <select value={platform} onChange={(event) => setPlatform(event.target.value)}>
                  {platforms.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label>
                <span>媒体</span>
                <select value={media} onChange={(event) => setMediaSelection(event.target.value)}>
                  {mediaOptions.map((item) => (
                    <option key={item} value={item}>{mediaLabels[item] ?? item}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>排序</span>
                <select
                  value={sortOrder}
                  onChange={(event) => {
                    const next = event.target.value;
                    if (isSortOrder(next)) setSortOrder(next);
                  }}
                >
                  <option value="score">MC 评分</option>
                  <option value="year">出版年份</option>
                </select>
              </label>
            </div>
          </div>

          {visibleGames.length > 0 ? (
            <div className={styles.gameGrid}>
              {visibleGames.map((game) => <GameCard key={game.slug} game={game} />)}
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
