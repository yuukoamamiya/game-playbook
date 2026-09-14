import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import gamesData from '../generated/games.json';
import styles from './index.module.css';

type GameRecord = {
  slug: string;
  title: string;
  platform: string;
  score: number;
  releaseYear: number | null;
  genre: string;
  metacriticUrl: string;
  ignScore: number | null;
  ignUrl: string;
  gamespotScore: number | null;
  gamespotUrl: string;
  notes?: string;
  hasTranslation: boolean;
  translationStatus: string;
};

function ExternalReviewLink({label, url, score}: {label: string; url: string; score: number | null}) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer">
      {label}{score ? ` ${score}` : ''} ↗
    </a>
  );
}

export default function Home(): React.ReactNode {
  const games = gamesData as GameRecord[];
  const highScoreGames = games.filter((game) => game.score >= 90);
  const translatedGames = games.filter((game) => game.hasTranslation);

  return (
    <Layout title="MC 高分游戏" description="Metacritic 高分且 Must-Play 游戏橱窗">
      <main className={styles.shelf}>
        <header className={styles.header}>
          <div className={styles.kicker}>METACRITIC / MUST-PLAY SHOWCASE</div>
          <h1>高分游戏橱窗</h1>
          <p>只收录 MC 90+ 且带有 Must-Play 标记的游戏，方便决定下一款玩什么。</p>
        </header>

        <section className={styles.summary} aria-label="游戏统计">
          <div><strong>{games.length}</strong><span>已收录</span></div>
          <div><strong>{highScoreGames.length}</strong><span>MC 90+</span></div>
          <div><strong>{translatedGames.length}</strong><span>已有中文译文</span></div>
        </section>

        <section className={styles.catalog}>
          <div className={styles.catalogHeading}>
            <h2>全部候选</h2>
            <span>按 MC 评分排序</span>
          </div>

          {highScoreGames.length > 0 ? (
            <div className={styles.gameGrid}>
              {highScoreGames.map((game) => (
                <article className={styles.gameCard} key={`${game.slug}-${game.platform}`}>
                  <div className={styles.score}>{game.score}</div>
                  <div className={styles.gameInfo}>
                    <h3>
                      {game.hasTranslation ? (
                        <Link to={`/docs/games/${game.slug}`}>{game.title}</Link>
                      ) : game.title}
                    </h3>
                    <p>{game.releaseYear || '年份待补'} · {game.genre || '类型待补'}</p>
                    <div className={styles.platforms}>{game.platform}</div>
                    <div className={game.hasTranslation ? styles.translationReady : styles.translationPending}>
                      {game.hasTranslation ? '中文译文已收录' : '中文译文待补'}
                    </div>
                    <div className={styles.reviewLinks}>
                      <ExternalReviewLink label="MC" url={game.metacriticUrl} score={game.score} />
                      <ExternalReviewLink label="IGN" url={game.ignUrl} score={game.ignScore} />
                      <ExternalReviewLink label="GS" url={game.gamespotUrl} score={game.gamespotScore} />
                    </div>
                    {game.notes && <div className={styles.note}>{game.notes}</div>}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <span className={styles.emptyNumber}>00</span>
              <div>
                <h3>还没有收录游戏</h3>
                <p>将筛选结果写入 CSV 后，Cloudflare Pages 构建时会自动生成橱窗数据。</p>
                <code>data/metacritic-games.csv</code>
              </div>
            </div>
          )}
        </section>

        <footer className={styles.footerNote}>
          <span>数据来源：Metacritic · 评测入口：IGN / GameSpot</span>
          <Link to="/docs/criteria">查看收录说明 →</Link>
        </footer>
      </main>
    </Layout>
  );
}
