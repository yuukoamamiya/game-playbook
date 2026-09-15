# Game Playbook 协作说明

这是本仓库当前有效的操作手册，供 AI 和人类维护者接手工作。历史决策见 [`docs/agent-history.md`](docs/agent-history.md)；接手任务时先读本文件，不要把历史摘要当成当前待办。

## 项目目标与当前状态

这是一个个人使用的 Docusaurus 静态网站，用来展示带有 Metacritic Must-Play 标记的高评价游戏，并集中管理媒体评测入口、文化评论入口和中文译文。

当前数据快照：

- `data/metacritic-games.json`：189 条“游戏 × 平台”记录，182 个去重游戏。
- 平台：PC、Nintendo Switch、Nintendo Switch 2、Game Boy Advance、Nintendo DS、3DS。
- 收录条件：`must_play === true`；MC 分数只用于展示和排序，不再要求 ≥90。
- Metacritic 当前没有可用的 SFC/SNES 平台筛选页；不要把全平台回退结果当作 SFC 数据。
- `sources` 可以保存多个媒体和作者的文章，不限制为 IGN、GameSpot 两家。

开始任何任务前，先检查：

```text
AGENTS.md
README.md
DESIGN.md
git status
```

当前工作区可能有未提交的媒体采集、数据迁移和生成文件改动。保留已有改动，不要用重置或覆盖方式清理工作区。

## 数据与内容分层

```text
data/metacritic-games.json    唯一主数据层，供抓取和不同 AI 交换
src/generated/games.json      生成文件，不手工编辑
src/generated/reviews.json    生成文件，不手工编辑
content/reviews/en/           私有英文来源，仅供翻译、摘要和核对
docs/games/                   前台公开的中文译文和媒体标签页
static/img/reviews/           游戏页图片，当前随仓库发布
```

### 主数据 JSON

每条记录代表一个游戏在一个平台上的 Metacritic 条目。核心字段包括：

```json
{
  "slug": "game-slug",
  "title": "Game Title",
  "platform": "PC",
  "metacritic_score": 90,
  "must_play": true,
  "release_year": 2024,
  "genre": "RPG",
  "metacritic_url": "https://www.metacritic.com/…",
  "sources": [{
    "site": "ign",
    "kind": "review",
    "language": "en",
    "score": 9,
    "url": "https://www.ign.com/…"
  }],
  "content_status": "links-only",
  "notes": "仅用于数据核对的操作说明"
}
```

规则：

- 使用 JSON，不要恢复 CSV 主数据层。
- `sources` 是唯一媒体来源结构；不要新增 `ign_url`、`gamespot_score`、`famitsu_urls` 等固定字段。
- `sources` 可以包含同一媒体的多篇文章。`site` 使用稳定的小写标识，`kind` 使用 `review`、`essay`、`feature` 或 `score`，无评分时 `score: null`。
- `notes` 只能写采集、版本或匹配方面的操作说明，不写个人游戏备注。
- 不要把英文正文、Cookie、API key、抓取凭据或个人隐私写进 JSON。
- 不确定的评分、版本、文章归属或 URL 宁可留空，不要猜测或使用搜索结果页代替文章页。
- `src/generated/*.json` 由 `npm run generate-data` 生成，禁止手工维护。

### 英文来源与中文公开页

- 英文来源放在 `content/reviews/en/`，必须位于 `docs/` 之外，不会被 Docusaurus 发布。
- 现有文件同时存在 `content/reviews/en/<slug>.md` 和 `content/reviews/en/<slug>/<site>.md` 两种布局；新增同一游戏的多媒体来源时优先使用后者。
- 中文公开页使用 `docs/games/<slug>.mdx`，slug 必须与 JSON 一致；新页面复制 `docs/games/_template.mdx`。
- 公开页只放中文译文、必要的原文链接和页面结构，不粘贴英文原文，不加入个人备注。
- 一个游戏只有一个公开页；不同媒体通过 `<ReviewTabs>` / `<ReviewTab>` 切换。

## 媒体与版本规则

- `kind: review` 必须明确对应当前收录的作品和版本。原版、皇家版、威力加强版、重制版和其他增强版不能未经确认互相替代。
- Early Access 评测按用户要求可以保留，并保持文章本身的版本状态。
- `kind: essay`、`feature`、文化评论、设计分析和历史回顾可以放宽版本对应；只要文章明确讨论同一作品即可。
- 不要为了提高覆盖率收录新闻、榜单、攻略、宣传稿或仅仅提到该游戏的文章。
- `indienova` 已因版权风险撤回，不要重新加入。
- 用户只要求入口时，只采集并核对 URL，不抓取正文；需要译文时才保存英文源并制作中文标签页。

当前使用的媒体 `site` 标识包括：

```text
ign, gamespot, pcgamer, eurogamer, rockpapershotgun, rpgsite,
adventuregamers, nintendoworldreport, 4gamer, famitsu, unwinnable,
rpgamer, crpgaddict, aftermath, radicalphilosophy, jesperjuul
```

新增媒体时：

1. 使用 `scripts/media-sources.mjs` 的 `addSource` / `hasSource` 写入 `sources`，避免重复 URL。
2. 若首页需要友好名称，在 `scripts/media-sources.mjs` 和 `src/pages/index.tsx` 的名称映射中增加标识；首页仍遍历通用 `sources`，不要增加专用字段。
3. 若有中文译文，在对应 MDX 的 `<ReviewTabs>` 中增加 `<ReviewTab site="…" label="…">`。`ReviewTabs` 组件通常不需要改。
4. 若有英文源，放入 `content/reviews/en/`，并在对应标签页保留来源链接。

组件根据 `src/generated/reviews.json` 判断哪些标签有实际译文：只有包含足够中文内容且不含“待补”的标签才显示；只有一个媒体时不显示标签栏。

## 推荐工作流

### 补充媒体入口

1. 在 `data/metacritic-games.json` 中按 `slug + platform` 找到目标记录。
2. 核对文章标题、作者/媒体、文章类型、具体版本和最终 URL。
3. 通过对应采集脚本或 `addSource` 写入 `sources`；不要直接批量猜测链接。
4. 运行数据校验和生成命令。

### 制作译文

1. 将已核对的英文文章保存到 `content/reviews/en/`。
2. 使用 AI 翻译或整理为中文，不把英文正文放入公开页。
3. 编辑 `docs/games/<slug>.mdx`，在对应 `<ReviewTab>` 中加入中文内容和原文链接。
4. 运行生成和类型检查，确认 `reviews.json` 能识别标签。

### 现有采集脚本

- `collect-metacritic-intersection.mjs`：重新抓取六个平台的 Must-Play 候选；会替换候选集合，运行前必须确认用户确实要求刷新主数据。
- `collect-ign-links.mjs`、`collect-gamespot-links.mjs`：补充 IGN / GameSpot 评测入口。
- `collect-ign-reviews.mjs`、`collect-ign-images.mjs`：抓取已核对的 IGN 英文来源和头图。
- `collect-4gamer-links.mjs`、`collect-rpgamer-links.mjs`、`collect-crpgaddict-links.mjs`、`collect-rps-links.mjs`、`collect-aftermath-links.mjs`、`collect-theorist-links.mjs`：补充对应媒体或作者的已核对来源。
- 法米通目前使用定向站内搜索/API 核对；没有可依赖的完整历史 sitemap，不要把 sitemap 数量当作覆盖率。
- `collect-review-links.mjs`、`collect-additional-review-links.mjs` 是早期 CSV 工作流遗留脚本，除非明确迁移它们，否则不要运行或把结果写回主数据。
- 抓取需要代理时使用 `http://127.0.0.1:10809`；不要把代理凭据写入仓库。

## 验证命令

修改数据、脚本或网站后，至少运行：

```text
npm run validate-data
npm run generate-data
npm run typecheck
git diff --check
```

修改了 `.mjs` 脚本时，再运行 `node --check scripts/changed-script.mjs`。不要默认运行本地生产构建；用户明确要求或需要验证构建时才运行 `npm run build`，正常部署由 Cloudflare Pages 执行。

## 网站与部署

- 技术栈：Docusaurus + React/TypeScript，网站为静态构建，不需要运行时数据库。
- Cloudflare Pages：Build command 为 `npm run build`，输出目录为 `build`，Node.js 使用 20 或更高版本。
- 主页数据来自 `src/generated/games.json`；平台筛选先筛选平台记录，再按 slug 合并，不能在 React 页面硬编码游戏列表。
- 图片目前存于 `static/img/reviews/`。待办是使用 Cloudflare Worker 代理 GitHub Raw 图片并设置缓存；Worker 上线前不要删除仓库内图片。
- 首页保持简洁：不要重新加入“MC90+”“Must-Play 筛选条件”“批次”等内部采集说明，也不要加入煽情文案。

## 当前待办

- 完成图片 Cloudflare Worker 代理方案：明确 Worker 路由、GitHub 源地址、缓存键和失效策略。
- 继续补充已收录游戏的媒体入口，但必须逐篇核对，不把自动匹配候选直接落库。
- 继续完成已有英文来源对应的中文译文；空的媒体标签页可以保留，组件会自动隐藏，也可以在确认后清理。
- 若数据结构、收录范围、版本规则或部署方式发生变化，先更新本文件，再继续修改代码或数据。

## Git 与交接规则

- 先看 `git status` 和相关 diff，保留用户已有改动。
- 使用补丁方式编辑文件；不要使用破坏性重置、覆盖或删除命令。
- 默认不提交、不推送、不发布；只有用户明确要求时才执行。
- 每次交接都说明：改动文件、验证结果、是否有未提交改动、当前待办和外部阻塞。
- 完成一个阶段、待办发生变化、收录规则或架构发生变化时，更新本文件的当前状态或待办。
- 不要因为切换 AI 或模型而重新抓取、重写或覆盖已完成的数据。
