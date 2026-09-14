import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import gamesData from '../generated/games.json';
import styles from './index.module.css';

type GameRecord = {
  slug: string;
  title: string;
  platform: string;
  score: number;
  releaseYear: number;
  genre: string;
  notes?: string;
};

export default function Home(): React.ReactNode {
  const games = gamesData as GameRecord[];
  const highScoreGames = games.filter((game) => game.score >= 90).sort((a, b) => b.score - a.score);

  return (
    <Layout title="MC 高分游戏" description="Metacritic 高分游戏橱窗">
      <main className={styles.shelf}>
        <header className={styles.header}>
          <div className={styles.kicker}>METACRITIC / HIGH SCORE SHOWCASE</div>
          <h1>MC 高分游戏</h1>
          <p>把高分游戏集中放在这里，方便快速挑选下一款。</p>
        </header>

        <section className={styles.summary} aria-label="游戏统计">
          <div><strong>{games.length}</strong><span>已收录</span></div>
          <div><strong>{highScoreGames.length}</strong><span>MC 90+</span></div>
          <div><strong>—</strong><span>最后更新</span></div>
        </section>

        <section className={styles.catalog}>
          <div className={styles.catalogHeading}>
            <h2>高分橱窗</h2>
            <span>按 MC 评分排序</span>
          </div>

          {highScoreGames.length > 0 ? (
            <div className={styles.gameGrid}>
              {highScoreGames.map((game) => (
                <article className={styles.gameCard} key={game.title}>
                  <div className={styles.score}>{game.score}</div>
                  <div className={styles.gameInfo}>
                    <h3><Link to={`/docs/games/${game.slug}`}>{game.title}</Link></h3>
                    <p>{game.releaseYear} · {game.genre}</p>
                    <div className={styles.platforms}>{game.platform}</div>
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
                <p>把第一款游戏文档加入文档库后，它会出现在这里。</p>
                <code>docs/games/</code>
              </div>
            </div>
          )}
        </section>

        <footer className={styles.footerNote}>
          <span>数据来源：Metacritic</span>
          <Link to="/docs/criteria">查看收录说明 →</Link>
        </footer>
      </main>
    </Layout>
  );
}
