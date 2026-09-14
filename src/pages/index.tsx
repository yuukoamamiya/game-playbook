import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import styles from './index.module.css';

export default function Home(): React.ReactNode {
  return (
    <Layout title="游戏档案库" description="一个帮助自己决定下一款玩什么的个人游戏档案库">
      <main className={styles.home}>
        <section className={styles.hero}>
          <div className={styles.eyebrow}><span>PLAYBOOK</span><span>PERSONAL GAME ARCHIVE</span></div>
          <h1>下一款，<em>玩什么。</em></h1>
          <p className={styles.lead}>把玩过的、想玩的和暂时不玩的游戏放在同一个安静、好查的地方。</p>
          <div className={styles.actions}>
            <Link className={styles.primaryAction} to="/docs/games">浏览游戏库 <span>↗</span></Link>
            <Link className={styles.textAction} to="/docs/criteria">查看评测标准</Link>
          </div>
        </section>

        <section className={styles.overview} aria-label="站点状态">
          <div className={styles.sectionLabel}>ARCHIVE / 00</div>
          <div className={styles.statGrid}>
            <div><strong>—</strong><span>已记录游戏</span></div>
            <div><strong>—</strong><span>强烈推荐</span></div>
            <div><strong>—</strong><span>正在游玩</span></div>
          </div>
        </section>

        <section className={styles.noteGrid}>
          <div>
            <div className={styles.sectionLabel}>WHY THIS EXISTS</div>
            <h2>少一点纠结，<br />多一点真正的游玩。</h2>
          </div>
          <div className={styles.noteCopy}>
            <p>这里不追求权威榜单，只记录对“我现在是否应该打开它”有用的信息。</p>
            <p>每个游戏都是一份独立档案，包含平台、类型、状态、个人评分和最重要的那句结论。</p>
            <Link to="/docs/intro">了解档案如何维护 <span>→</span></Link>
          </div>
        </section>

        <section className={styles.emptyState}>
          <div className={styles.emptyIndex}>01</div>
          <div>
            <h2>游戏档案正在整理中</h2>
            <p>具体测评会逐步加入。先从统一的记录方式开始。</p>
            <Link className={styles.outlineAction} to="/docs/games">进入游戏库</Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}
